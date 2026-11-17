import type { Metrics, Persistence, Specimen, Variant } from '../domain/types.ts';

const m = (carbon: number, plastic = 0, blue = 0, mass = 0, green = 0, grey = 0): Metrics => ({ carbon, plastic, water: { green, blue, grey }, mass });
const na: Persistence = { years: null, label: '不适用', note: '能源与服务没有可相加的材料降解年限。' };
const fate = (years: number, label: string): Persistence => ({ years, label, note: '教学参考量级，非标准试验。环境条件决定实际归趋；碎裂不等于完全降解。' });
const v = (id: string, label: string, description: string, metrics: Metrics, calculation: string, persistence: Persistence = na, sourceIds = ['teaching'], extra: Partial<Variant> = {}): Variant => ({ id, label, description, metrics, calculation, persistence, sourceIds, evidence: sourceIds.includes('food') ? '文献因子推算 + 情景假设' : '公开资料背景 + 教学假设', ...extra });

export const specimens: Specimen[] = [
  {
    id: 'coffee', number: '01', name: '一杯外卖冰美式', english: 'ICED AMERICANO', subtitle: '400 mL · 黑咖啡 · 3 km 配送', unit: '一杯400mL黑咖啡', frequency: 4, frequencyUnit: 'week', waterScope: '绿 + 蓝 + 灰水足迹；不是饮用水量', boundary: '18g咖啡豆、400mL饮品，含原料、制备、包装及3km末端配送；包装末端负担并入材料因子。不含门店建筑与设备制造。', presetName: '自带杯 · 步行到店', preset: { 'coffee-lid': 'no-lid', 'coffee-cup': 'own-cup', 'coffee-bag': 'no-bag', 'coffee-delivery': 'walk' },
    layers: [
      { id: 'coffee-lid', label: 'PP防漏杯盖与吸管', short: '杯盖与吸管', material: 'PP / POLYPROPYLENE', kind: 'material', stage: '包装', variants: [
        v('disposable', '一次性盖 + 吸管', '6g PP，制造与末端合并为教学因子。', m(21, 6, .12, 6), '6g × 3.5g CO₂e/g；蓝水0.12L', fate(300, '100–450 Years')),
        v('no-lid', '无需一次性盖与吸管', '到店饮用或使用自带杯盖；杯盖摊销计入自带杯方案。', m(0), '不领取该一次性部件，0g')
      ] },
      { id: 'coffee-beans', label: '咖啡豆与浓缩液', short: '咖啡与豆源', material: '18g / ROASTED COFFEE', kind: 'material', stage: '原料', variants: [
        v('conventional', '常规豆源情景', '18g豆；包含种植、运输、烘焙。无奶，不假定跨洋冷链。', m(90, 0, 15, 18, 120, 5), '18g × 5g CO₂e/g；140L水足迹按绿120/蓝15/灰5分配', fate(.167, '2 Months'), ['coffee-lca', 'coffee-water', 'teaching']),
        v('lower-input', '较低投入豆源情景', '同样18g豆；降低农资与运输负担的假设，并非本地必然更低碳。', m(60, 0, 12, 18, 100, 4), '18g × 3.333333g CO₂e/g；水分配为教学情景', fate(.167, '2 Months'), ['coffee-lca', 'teaching'])
      ] },
      { id: 'coffee-ice', label: '制冰机与冲煮电力', short: '制冰与冲煮', material: '0.07 kWh / PREPARATION', kind: 'process', stage: '制备', variants: [
        v('grid', '常规制冰与冲煮', '制备电力0.07kWh，直接用水0.6L；无乳制品。', m(35, 0, .6, 180), '0.07kWh × 500g CO₂e/kWh'),
        v('efficient', '节能制备情景', '同份饮品，节能设备与低碳时段；并非可对所有门店保证。', m(16, 0, .5, 180), '0.04kWh × 400g CO₂e/kWh')
      ] },
      { id: 'coffee-cup', label: 'PET杯身与隔热袖套', short: '杯身与袖套', material: 'PET / PAPER SLEEVE', kind: 'material', stage: '包装', variants: [
        v('pet', '一次性PET杯与袖套', '15g PET杯 + 5g纸套，含教学末端负担。', m(48, 15, .3, 20), '15g × 3 + 5g × 0.6 = 48g CO₂e', fate(450, '≈450 Years')),
        v('own-cup', '自带保温杯', '杯制造按300次使用摊销；每次洗杯的水和能耗另计，不当成零排放。', m(18, .01, .8, .8), '制造3000g/300次 + 清洗8g = 18g；蓝水0.8L', { years: null, label: '耐用品', note: '制造和末端按300次摊销；不提供无依据的金属自然降解年限。' })
      ] },
      { id: 'coffee-bag', label: '保温配送袋与封签', short: '配送袋', material: 'PE / INSULATION', kind: 'material', stage: '包装', variants: [
        v('bag', '一次性配送袋', '4g PE与贴纸；不是骑手重复使用的配送箱。', m(12, 4, .1, 5), '4g × 3g CO₂e/g', fate(150, '100–200 Years')),
        v('no-bag', '不用配送袋', '现场取杯，不领取一次性袋。', m(0), '该部件取消，0g')
      ] },
      { id: 'coffee-delivery', label: '骑手3km配送', short: '最后三公里', material: '3 km / LAST MILE', kind: 'process', stage: '运输', variants: [
        v('rider', '3km电动车配送', '单次分摊的教学运输强度；不代表所有城市或订单。', m(45, 0, .08), '3km × 15g CO₂e/km'),
        v('walk', '顺路步行自取', '仅限原本顺路步行，不新增机动车行程；不计人体代谢。', m(0), '无新增机动配送里程')
      ] }
    ]
  },
  {
    id: 'meal', number: '02', name: '一份深夜麻辣烫', english: 'MIDNIGHT TAKEOUT', subtitle: '20g 蛋白服务 · 3 盒分装', unit: '一餐含20g主蛋白的麻辣烫', frequency: 4, frequencyUnit: 'week', waterScope: '绿 + 蓝 + 灰水足迹；配方分配为教学假设', boundary: '含食材生产、汤底、烹饪、一次性包装与3km配送。主蛋白按20g蛋白比较，非完全营养等效；不含门店资本设施。', presetName: '植物蛋白 · 单碗 · 无餐具', preset: { 'meal-utensils': 'none', 'meal-box': 'single', 'meal-protein': 'tofu', 'meal-bag': 'none' },
    layers: [
      { id: 'meal-utensils', label: '木筷与纸巾包', short: '筷子与纸巾', material: 'WOOD / TISSUE', kind: 'material', stage: '包装', variants: [v('single-use', '一次性筷子纸巾', '5g木筷、2g纸与1g薄膜包装。', m(12, 1, .2, 8), '木纸7g×1 + 塑膜1g×5 = 12g', fate(.167, '2–6 Months')), v('none', '无需一次性餐具', '使用宿舍已有餐具；清洗负担计3g CO₂e/0.3L。', m(3, 0, .3), '已有餐具本次清洗3g CO₂e')] },
      { id: 'meal-box', label: '3个PP餐盒与汤碗', short: 'PP分装餐盒', material: 'PP 05 / INJECTION MOLDED', kind: 'material', stage: '包装', variants: [v('triple', '三盒分装', '60g PP总重。', m(210, 60, 1.2, 60), '60g × 3.5g CO₂e/g', fate(300, '100–450 Years')), v('single', '单碗合装', '同等容量合装为25g PP，不伪称可生物降解。', m(87.5, 25, .5, 25), '25g × 3.5g CO₂e/g', fate(300, '100–450 Years'))] },
      { id: 'meal-protein', label: '牛油汤底与红肉', short: '汤底与主蛋白', material: '20g PROTEIN / FOOD SYSTEM', kind: 'material', stage: '原料', variants: [
        v('beef', '红肉 + 牛油汤底', '以20g肉牛群牛肉蛋白比较；约100g食材只是份量示意，不代表奶牛来源牛肉。', m(10278, 0, 120, 150, 1100, 80), '49.89kg/100g蛋白 × 20g ×1000 + 汤底300g = 10278g', fate(.167, '≈2 Months'), ['food', 'teaching']),
        v('tofu', '植物蛋白 + 菌菇汤底', '20g豆腐蛋白服务；食物体积、脂肪与微量元素并不等效。', m(476, 0, 35, 280, 160, 15), '1.98kg/100g蛋白 ×20g×1000 + 汤底80g =476g', fate(.167, '≈2 Months'), ['food', 'teaching']),
        v('chicken', '鸡胸肉 + 清汤底', '20g禽肉蛋白服务，汤底采用同一80g情景。', m(1220, 0, 50, 150, 350, 25), '5.7kg/100g蛋白 ×20g×1000 + 汤底80g =1220g', fate(.167, '≈2 Months'), ['food', 'teaching'])
      ] },
      { id: 'meal-veg', label: '蔬菜与菌菇', short: '蔬菜与菌菇', material: '250g / VEGETABLES', kind: 'material', stage: '原料', variants: [v('regular', '常规蔬菜配菜', '250g配菜，供应与种植均为教学情景。', m(180, 0, 20, 250, 40, 5), '0.25kg ×720g CO₂e/kg', fate(.167, '≈2 Months')), v('seasonal', '本地时令配菜', '同250g，非温室、非空运情景；本地并非无条件更低碳。', m(110, 0, 14, 250, 30, 4), '0.25kg ×440g CO₂e/kg', fate(.167, '≈2 Months'))] },
      { id: 'meal-bag', label: 'PE袋与封口签', short: '袋与封签', material: 'PE / SECURITY SEAL', kind: 'material', stage: '包装', variants: [v('bag', '塑料袋与封签', '6g塑料、1g纸。', m(19, 6, .15, 7), '6g×3 + 纸签1g =19g', fate(150, '100–200 Years')), v('none', '自备提袋', '已有布袋制造与清洗按使用次数分摊，不计零负担。', m(4, 0, .1, .4), '重复使用负担分摊4g CO₂e')] },
      { id: 'meal-process', label: '烹饪热力与末端配送', short: '烹饪与配送', material: 'HEAT / LAST MILE', kind: 'process', stage: '制备', variants: [v('delivery', '常规烹饪 + 配送', '0.3kWh烹饪分摊及3km骑手配送。', m(195, 0, 1.5), '0.3kWh×500 + 3km×15 =195g'), v('pickup', '合锅节能 + 步行取餐', '0.22kWh烹饪分摊，顺路步行。', m(110, 0, 1.2), '0.22kWh×500 =110g')] }
    ]
  },
  {
    id: 'shirt', number: '03', name: '一件39元纯棉T恤', english: 'THE 39-YUAN T-SHIRT', subtitle: '250g 纯棉 · 5次穿着基线', unit: '5次穿着服务（基线1件）', frequency: 12, frequencyUnit: 'year', waterScope: '绿 + 蓝 + 灰水足迹；生产2700L为分配假设', boundary: '250g棉T恤，从种植到制造、物流、包装、洗涤与末端。生产水2700L按工序分配；对比按相同穿着次数，不把延寿当成整件制造排放消失。', presetName: '穿得更久 · 冷洗晾干', preset: { 'shirt-use': 'long-life', 'shirt-pack': 'minimal', 'shirt-transport': 'ground' },
    layers: [
      { id: 'shirt-cotton', label: '棉花种植与肥料', short: '棉花种植', material: '250g / COTTON', kind: 'material', stage: '原料', variants: [v('virgin', '常规原生棉', '教学制造链；2400L分配到种植，非全部为灌溉水。', m(1800, 0, 500, 250, 1800, 100), '0.25kg×7200g CO₂e/kg；水绿1800/蓝500/灰100', fate(.5, '≈6 Months'), ['cotton', 'teaching']), v('recycled', '部分再生棉情景', '含再生材料处理负担与原生补强；品质与来源另需实际认证。', m(1000, 0, 300, 250, 1000, 80), '250g混纺供应链教学分摊1000g CO₂e', fate(.5, '≈6 Months'), ['cotton', 'teaching'])] },
      { id: 'shirt-dye', label: '纺纱、印染与废水处理', short: '纺纱与印染', material: 'SPIN / DYE / WATER', kind: 'process', stage: '制造', variants: [v('standard', '常规纺纱印染', '生产水余量300L：蓝180/灰120，不与种植重复。', m(2500, 0, 180, 0, 0, 120), '5kWh等价×500g CO₂e/kWh', na, ['cotton', 'teaching']), v('efficient', '低浴比与节能印染', '制造碳与废水负担均为公开工艺方向下的教学变化。', m(1600, 0, 100, 0, 0, 70), '3.2kWh等价×500g CO₂e/kWh', na, ['cotton', 'teaching'])] },
      { id: 'shirt-cut', label: '裁剪与成衣缝制', short: '裁剪与缝制', material: 'CUT / SEW', kind: 'process', stage: '制造', variants: [v('standard', '常规裁剪缝制', '用电及裁剪损耗合并的教学负担。', m(500), '1kWh等价×500g CO₂e/kWh'), v('optimized', '优化排料', '减少工艺损耗，仍有非零制造负担。', m(350), '0.7kWh等价×500g CO₂e/kWh')] },
      { id: 'shirt-transport', label: '跨省与跨国物流', short: '成衣物流', material: 'FREIGHT / DISTRIBUTION', kind: 'process', stage: '运输', variants: [v('mixed', '混合物流情景', '制造地到收货端的分配负担，不假定所有衣物航空运输。', m(450), '250g成衣全程运输分摊450g CO₂e'), v('ground', '非空运合并物流', '减少加急与零散运输的教学情景。', m(180), '250g成衣全程运输分摊180g CO₂e')] },
      { id: 'shirt-pack', label: '吊牌、PE袋与纸箱', short: '吊牌与包装', material: 'PAPER / PE', kind: 'material', stage: '包装', variants: [v('full', '常规快递包装', '5g塑料与75g纸，制造/末端含在因子中。', m(90, 5, .4, 80), '5g塑料×3 + 75g纸×1 =90g', fate(150, '100–200 Years')), v('minimal', '精简纸包装', '不用塑料袋，保留30g纸包装。', m(30, 0, .15, 30), '30g纸×1 =30g', fate(.167, '≈2 Months'))] },
      { id: 'shirt-use', label: '穿着、洗涤与末端处置', short: '穿着与末端', material: 'WEAR / WASH / END OF LIFE', kind: 'process', stage: '使用', variants: [v('five-wears', '穿5次后闲置处置', '每次穿着洗涤分摊70g/5L；每件末端100g。', m(450, 0, 25), '5次×70g + 末端100g =450g；水5×5L', na, ['teaching'], { wears: 5, washCarbon: 70, washWater: 5, endpointCarbon: 100 }), v('long-life', '穿50次 · 冷洗自然晾干', '每次穿着35g/4L；每件修补及末端合计160g；按相同穿着需求归一化。', m(1910, 0, 200), '50次×35g + 修补末端160g =1910g/全件生命周期', na, ['teaching'], { wears: 50, washCarbon: 35, washWater: 4, endpointCarbon: 160 })] }
    ]
  },
  {
    id: 'ai', number: '04', name: '一次通宵AI科研作业', english: 'AN OVERNIGHT AI RUN', subtitle: '8h 教学作业 · 4 GPU 情景', unit: '基准8小时科研作业情景', frequency: 1, frequencyUnit: 'week', waterScope: '蓝水消耗：现场冷却 + 发电；不含硬件供应链水', boundary: '情景化网络、GPU/主机、设施能源与硬件碳摊销；不是大模型完整训练成本。电网和复用仅为驱动，不新增贡献；硬件供应链水未知且不计入小计。', presetName: '低碳时段 · 复用优先', preset: { 'ai-grid': 'cleaner', 'ai-reuse': 'reuse', 'ai-cooling': 'efficient' },
    layers: [
      { id: 'ai-network', label: '提示词输入与网络传输', short: '输入与网络', material: 'PROMPT / NETWORK', kind: 'process', stage: '网络', variants: [v('standard', '常规输入与网络', '输入/传输/客户端分摊；不代表一个提示词固定排放。', m(12, 0, .03), '0.024kWh等价×500g CO₂e/kWh'), v('cached', '精简输入与本地缓存', '仅减少冗余传输；缓存不是让服务器计算免费。', m(6, 0, .015), '0.012kWh等价×500g CO₂e/kWh')] },
      { id: 'ai-gpu', label: 'GPU集群与主机用电', short: 'GPU与主机', material: '4 GPU / IT POWER', kind: 'process', stage: '计算', variants: [v('full', '4 GPU常规功率情景', '4×300W额定×85%负载 + 150W主机；基准8h。', m(0), '(4×300×0.85+150)W×8h/1000；碳乘电网系数', na, ['teaching'], { ai: { gpuCount: 4, gpuWatts: 300, utilization: .85, hostWatts: 150 } }), v('efficient', '等工作量节能配置假设', '250W×4、85%负载、120W主机；任务等效仅为教学假设，实际须用基准测试确认。', m(0), '(4×250×0.85+120)W×有效小时/1000', na, ['teaching'], { ai: { gpuCount: 4, gpuWatts: 250, utilization: .85, hostWatts: 120 } })] },
      { id: 'ai-cooling', label: '散热、制冷与设施开销', short: '散热与设施', material: 'PUE / WUE', kind: 'process', stage: '设施', variants: [v('standard', 'PUE1.4 / WUE0.8', '设施额外用电为IT×0.4；现场水0.8L/IT-kWh。', m(0), '额外用电=IT×(1.4−1)；现场水=IT×0.8', na, ['teaching'], { ai: { pue: 1.4, wue: .8 } }), v('efficient', 'PUE1.15 / WUE0.3', '低开销冷却情景，不宣称所有液冷都省水。', m(0), '额外用电=IT×0.15；现场水=IT×0.3', na, ['teaching'], { ai: { pue: 1.15, wue: .3 } })] },
      { id: 'ai-grid', label: '电网火电与清洁能源比例', short: '电网结构', material: 'GRID FACTOR / DRIVER', kind: 'driver', stage: '参数', variants: [v('mixed', '混合电网500g/kWh', '乘于GPU与设施用电；本层不重复相加。供电耗水0.6L/kWh。', m(0), '电网排放系数500g/kWh；供电水0.6L/kWh', na, ['teaching'], { ai: { gridCarbon: 500, gridWater: .6 } }), v('cleaner', '低碳时段150g/kWh', '电网情景参数，不是实时调度承诺；供电水0.4L/kWh也是假设。', m(0), '电网排放系数150g/kWh；供电水0.4L/kWh', na, ['teaching'], { ai: { gridCarbon: 150, gridWater: .4 } })] },
      { id: 'ai-reuse', label: '模型复用与端侧轻量化', short: '复用与轻量化', material: 'WORKLOAD / DRIVER', kind: 'driver', stage: '参数', variants: [v('full', '重新执行完整工作量', '基准8小时，不包含训练前的数据搜集等未建模工作。', m(0), '有效时长=8h×1', na, ['teaching'], { ai: { workload: 1 } }), v('reuse', '复用模型 · 只做必要计算', 'Qoder端侧静态架构优化是策略示例；假设科研作业仅需40%剩余工作，不代表静态页替代训练或质量相同。', m(0), '有效时长=8h×0.4=3.2h；本层不重复扣减', na, ['teaching'], { ai: { workload: .4 } })] },
      { id: 'ai-hardware', label: '硬件制造与末端分摊', short: '硬件生命周期', material: 'EMBODIED / ALLOCATION', kind: 'process', stage: '制造', variants: [v('standard', '20,000小时使用寿命', '整组GPU/主机制造与末端合计4000kg CO₂e，按占用时间分摊；非具体设备实测。', m(0), '4,000,000g/20,000h×有效小时', na, ['teaching'], { ai: { embodiedCarbon: 4000000, hardwareHours: 20000 } }), v('extend', '延长至30,000小时', '保持同一制造负担；假定性能与可靠性足够，不计强迫报废抵扣。', m(0), '4,000,000g/30,000h×有效小时', na, ['teaching'], { ai: { embodiedCarbon: 4000000, hardwareHours: 30000 } })] }
    ]
  }
];
