import argparse
import json
import math
import struct
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:4175')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
artifacts = root / 'artifacts'
artifacts.mkdir(exist_ok=True)
samples = json.loads((artifacts / 'data-validation.json').read_text(encoding='utf-8'))['samples']
results = {'status': 'running', 'baseUrl': args.base_url, 'checks': [], 'screenshots': [], 'downloads': [], 'consoleErrors': [], 'pageErrors': [], 'failedRequests': [], 'externalRequests': [], 'limitations': ['Headless Chromium实际渲染与交互；听感未人工试听', '本地测试耗时不代表任意公网网络速度', '截图文件已生成；界面几何同时由DOM测量验证']}


def passed(name, detail=None):
    results['checks'].append({'name': name, 'status': 'passed', 'detail': detail})
    print('PASS', name, flush=True)


def shot(page, name):
    path = artifacts / f'{name}.png'
    page.screenshot(path=str(path), full_page=True, animations='disabled')
    results['screenshots'].append(path.name)


def assert_close(a, b):
    assert math.isclose(float(a), float(b), abs_tol=1e-6), f'{a} != {b}'


def get_carbon(page):
    return float(page.get_by_test_id('lab').get_attribute('data-carbon'))


def download_receipt(page, name):
    expected_carbon = get_carbon(page)
    page.get_by_role('button', name='生成我的地球小票', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    link = dialog.get_by_role('link', name='下载地球小票 PNG')
    expect(link).to_be_visible(timeout=15000)
    assert_close(dialog.get_attribute('data-receipt-carbon'), expected_carbon)
    img = dialog.locator('img')
    expect(img).to_have_attribute('width', '1200')
    expect(img).to_have_attribute('height', '1600')
    assert img.evaluate('(i) => i.complete && i.naturalWidth === 1200 && i.naturalHeight === 1600')
    with page.expect_download() as pending:
        link.click()
    download = pending.value
    assert download.failure() is None
    path = artifacts / f'receipt-{name}.png'
    download.save_as(path)
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == (1200, 1600)
    with Image.open(path) as image:
        image.load()
        assert image.size == (1200, 1600)
        assert max(ImageStat.Stat(image.convert('RGB')).stddev) > 15
    results['downloads'].append({'file': path.name, 'bytes': len(data), 'width': 1200, 'height': 1600, 'carbon': expected_carbon})
    if name == 'coffee':
        page.screenshot(path=str(artifacts / 'receipt-preview.png'))
        results['screenshots'].append('receipt-preview.png')
    dialog.get_by_role('button', name='关闭地球小票').click()
    expect(dialog).not_to_be_visible()
    expect(page.get_by_role('button', name='生成我的地球小票', exact=True)).to_be_focused()
    return path


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, accept_downloads=True)
        context.add_init_script('''(() => {
            const Actual = window.AudioContext;
            window.__audioEvidence = {contexts: 0, oscillators: 0, starts: 0, states: []};
            if (!Actual) return;
            window.AudioContext = class extends Actual {
                constructor(...args) { super(...args); window.__audioEvidence.contexts++; this.addEventListener('statechange', () => window.__audioEvidence.states.push(this.state)); }
                createOscillator() { const osc=super.createOscillator(); window.__audioEvidence.oscillators++; const start=osc.start.bind(osc); osc.start=(...args)=>{window.__audioEvidence.starts++; return start(...args)}; return osc; }
            };
        })();''')
        page = context.new_page()
        origin = urlparse(args.base_url).netloc
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        page.on('console', lambda message: results['consoleErrors'].append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: results['failedRequests'].append({'url': request.url, 'error': request.failure}))
        page.on('request', lambda request: results['externalRequests'].append(request.url) if urlparse(request.url).scheme in ('http', 'https') and urlparse(request.url).netloc != origin else None)
        started = time.monotonic()
        page.goto(args.base_url)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_test_id('lab')).to_have_attribute('data-specimen', 'coffee')
        results['firstLoadMs'] = round((time.monotonic() - started) * 1000)
        results['browser'] = browser.version
        results['navigationTiming'] = page.evaluate('performance.getEntriesByType("navigation")[0].toJSON()')
        assert page.locator('.sample-tab').count() == 4
        assert page.locator('.bom-item').count() == 6
        assert page.evaluate('window.__audioEvidence.contexts') == 0
        assert_close(get_carbon(page), 251)
        shot(page, 'desktop-default')
        passed('默认咖啡、四样品、六层与无音频自动播放')
        control_box = page.locator('.explosion-controls').bounding_box()
        assert control_box['y'] + control_box['height'] <= 900, control_box
        passed('桌面首屏可见拆解操作区', control_box)
        token_consumers = page.evaluate('''() => {
            const root = document.documentElement;
            const original = getComputedStyle(document.body).backgroundColor;
            root.style.setProperty('--site-bg', '#f0f1ed');
            const changed = getComputedStyle(document.body).backgroundColor;
            root.style.removeProperty('--site-bg');
            return {original, changed, radius: getComputedStyle(document.querySelector('.sample-list')).borderRadius, font: getComputedStyle(document.body).fontFamily};
        }''')
        assert token_consumers['original'] != token_consumers['changed']
        passed('本地工作台外观变量被真实样式消费', token_consumers)

        slider = page.get_by_role('slider', name='拆解间距')
        slider.focus()
        slider.press('Home')
        expect(slider).to_have_value('0')
        assembled_y = float(page.get_by_test_id('svg-layer-0').get_attribute('data-transform-y'))
        slider.press('End')
        expect(slider).to_have_value('100')
        exploded_y = float(page.get_by_test_id('svg-layer-0').get_attribute('data-transform-y'))
        assert exploded_y < assembled_y - 50
        page.get_by_role('button', name='组装态', exact=True).click()
        slider.focus()
        for _ in range(50):
            slider.press('ArrowRight')
        expect(slider).to_have_value('50')
        box = slider.bounding_box()
        page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.mouse.down()
        page.mouse.move(box['x'] + box['width'] * .8, box['y'] + box['height'] / 2, steps=8)
        page.mouse.up()
        assert float(slider.input_value()) > 70
        passed('爆炸滑块键盘0/50/100及真实指针拖动', {'assembledY': assembled_y, 'explodedY': exploded_y})

        page.get_by_role('button', name='组装态', exact=True).click()
        stage = page.get_by_label('拆解画布，点击后可用滚轮调节拆解')
        stage.click(position={'x': 15, 'y': 50})
        page.mouse.wheel(0, 300)
        expect(slider).not_to_have_value('0')
        page.get_by_role('button', name='完全拆解', exact=True).click()
        shot(page, 'coffee-exploded')
        passed('聚焦舞台滚轮调节与完全拆解')

        for sample in samples:
            id = sample['specimen']
            page.get_by_test_id(f'sample-{id}').click()
            page.get_by_role('button', name='恢复基线', exact=True).click()
            expect(page.get_by_test_id('lab')).to_have_attribute('data-specimen', id)
            assert_close(get_carbon(page), sample['baseline']['carbon'])
            page.get_by_role('button', name='完全拆解', exact=True).click()
            for i in range(6):
                graphic = page.get_by_test_id(f'svg-layer-{i}')
                graphic.locator('path:not([fill="none"])').first.click()
                expect(page.get_by_test_id(f'layer-{i}')).to_have_attribute('aria-pressed', 'true')
                page.get_by_test_id(f'layer-{(i + 1) % 6}').click()
                expect(page.get_by_test_id(f'layer-{(i + 1) % 6}')).to_have_attribute('aria-pressed', 'true')
            callouts = page.locator('.callout').evaluate_all('''items => items.map(e => {
                const titles = [...e.querySelectorAll('text')].map(t => { const b=t.getBBox(); return {x:b.x,y:b.y,width:b.width,height:b.height}; });
                return titles;
            })''')
            for labels in callouts:
                for box in labels:
                    assert box['x'] >= 0 and box['x'] + box['width'] <= 760, (id, box)
                    assert box['y'] >= 0 and box['y'] + box['height'] <= 680, (id, box)
            for mode in ['water', 'decay', 'carbon']:
                page.get_by_test_id(f'mode-{mode}').click()
                expect(page.get_by_test_id('exploded-svg')).to_have_attribute('data-mode', mode)
                expect(page.get_by_test_id(f'mode-{mode}')).to_have_attribute('aria-pressed', 'true')
                assert_close(get_carbon(page), sample['baseline']['carbon'])
                if id == 'coffee' and mode == 'water':
                    shot(page, 'coffee-water')
            selects = page.locator('.swap-group select')
            for i in range(6):
                select = selects.nth(i)
                options = select.locator('option').evaluate_all('(options) => options.map(o => o.value)')
                for option in options[1:]:
                    select.select_option(option)
                    expect(page.get_by_test_id(f'svg-layer-{i}')).to_have_attribute('data-swapped', 'true')
                    assert math.isfinite(get_carbon(page))
                select.select_option(options[0])
            assert_close(get_carbon(page), sample['baseline']['carbon'])
            page.locator('.preset-button').click()
            assert_close(get_carbon(page), sample['preset']['carbon'])
            sankey = page.get_by_test_id('sankey')
            assert_close(sankey.get_attribute('data-before'), sample['baseline']['carbon'])
            assert_close(sankey.get_attribute('data-after'), sample['preset']['carbon'])
            assert page.locator('.specimen-layer.is-swapped').count() > 0
            page.locator('.flow-panel').get_by_role('button', name='水足迹', exact=True).click()
            assert_close(sankey.get_attribute('data-after'), sum(sample['preset']['water'].values()))
            page.locator('.flow-panel').get_by_role('button', name='碳排放', exact=True).click()
            shot(page, f'{id}-modified')
            download_receipt(page, id)
            passed(f'{id}: 六层真实点击、三模式、全部选项、组合改装、桑基守恒、PNG下载与焦点恢复')

        page.get_by_test_id('sample-coffee').click()
        frequency = page.locator('#frequency')
        frequency.fill('0')
        expect(frequency).to_have_value('0')
        assert_close(page.locator('.annual-saving .number').get_attribute('data-value'), 0)
        frequency.fill('4')
        page.locator('.impact-panel').get_by_role('button', name='一年', exact=True).click()
        assert_close(page.locator('.annual-saving .number').get_attribute('data-value'), 108 * 208 / 1000)
        page.locator('.impact-panel').get_by_role('button', name='大学四年', exact=True).click()
        assert_close(page.locator('.annual-saving .number').get_attribute('data-value'), 108 * 832 / 1000)
        page.get_by_test_id('sample-shirt').click()
        expect(frequency).to_have_value('12')
        expect(page.locator('.service-note')).to_contain_text('240')
        passed('独立频次、零频次、年度/四年及T恤同穿着服务')

        page.get_by_role('button', name='开启声音', exact=True).click()
        sound = page.get_by_role('button', name='关闭声音', exact=True)
        expect(sound).to_have_attribute('aria-pressed', 'true')
        page.locator('.preset-button').click()
        audio = page.evaluate('window.__audioEvidence')
        assert audio['contexts'] == 1 and audio['starts'] > 0
        sound.click()
        expect(page.get_by_role('button', name='开启声音', exact=True)).to_have_attribute('aria-pressed', 'false')
        starts = page.evaluate('window.__audioEvidence.starts')
        page.get_by_test_id('layer-0').click()
        assert page.evaluate('window.__audioEvidence.starts') == starts
        passed('真实WebAudio手势初始化、合成节点、静音阻止后续发声', audio)

        page.get_by_role('button', name='方法与数据', exact=True).click()
        expect(page.get_by_role('dialog')).to_be_visible()
        expect(page.get_by_role('dialog')).to_contain_text('不是碳核证工具')
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).not_to_be_visible()
        passed('方法与来源弹窗及Escape关闭')

        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.get_by_test_id('sample-coffee').click()
        page.get_by_role('button', name='恢复基线', exact=True).click()
        page.get_by_role('button', name='完全拆解', exact=True).click()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        for selector in ['.sample-list', '.drawing-stage', '.configurator', '.receipt-banner']:
            r = page.locator(selector).bounding_box()
            assert r['x'] >= 0 and r['x'] + r['width'] <= 391, (selector, r)
        page.locator('.preset-button').click()
        assert_close(get_carbon(page), 143)
        shot(page, 'mobile-coffee')
        download_receipt(page, 'mobile')
        passed('390px移动端无横向溢出、完整交互与PNG下载')

        page.emulate_media(reduced_motion='reduce')
        page.get_by_role('button', name='组装态', exact=True).click()
        assert page.locator('.specimen-layer').first.evaluate('(e)=>parseFloat(getComputedStyle(e).transitionDuration)') < .02
        context.set_offline(True)
        page.get_by_test_id('sample-ai').click()
        page.locator('.preset-button').click()
        assert_close(get_carbon(page), 1297.84)
        download_receipt(page, 'offline-ai')
        context.set_offline(False)
        passed('reduced-motion与加载后断网切样品、改装、PNG导出')

        results['layout'] = page.evaluate('({width:innerWidth, scrollWidth:document.documentElement.scrollWidth})')
        assert not results['pageErrors'], results['pageErrors']
        assert not results['consoleErrors'], results['consoleErrors']
        assert not results['externalRequests'], results['externalRequests']
        assert not results['failedRequests'], results['failedRequests']
        passed('全程零控制台错误、零页面错误、零失败请求、零外部资源请求')
        context.close()
        browser.close()
        results['status'] = 'passed'
except Exception as error:
    results['status'] = 'failed'
    results['failure'] = str(error)
    print('FAIL', error, flush=True)
    raise
finally:
    (artifacts / 'browser-validation.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
