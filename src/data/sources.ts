import type { Source } from '../domain/types.ts';

export const DATA_VERSION = 'EC-LAB / 2026.11-v1';
export const sources: Source[] = [
  { id: 'coffee-lca', title: '咖啡生命周期：运输与加工情景', url: 'https://rgs-ibg.onlinelibrary.wiley.com/doi/full/10.1002/geo2.96', citation: 'Nab & Maslin (2020), GEO: Geography and Environment, doi:10.1002/geo2.96', use: '提供咖啡供应链情景差异的背景；应用按18g豆、400mL黑咖啡建立教学样品。', limitation: '研究为巴西/越南至英国供应链；本应用的90/60g豆源贡献是教学选值，不是云南或某商家实测。' },
  { id: 'coffee-water', title: '咖啡碳与水足迹的边界', url: 'https://link.springer.com/article/10.1007/s11367-020-01799-5', citation: 'Usva et al. (2020), The International Journal of Life Cycle Assessment', use: '说明灌溉、产地、冲煮及加奶会改变结果。', limitation: '文献水稀缺加权m³ eq不能直接当普通L；本应用140L水足迹及其分项是教学假设，不从稀缺加权值换算。' },
  { id: 'food', title: '食品排放：每100g蛋白质', url: 'https://ourworldindata.org/grapher/ghg-per-protein-poore', citation: 'Poore & Nemecek (2018), processed by Our World in Data', use: '选取20g蛋白服务：肉牛群牛肉49.89、禽肉5.7、豆腐1.98 kg CO₂e/100g蛋白，对应9978、1140、396g CO₂e。', limitation: '是蛋白功能单位，不是100g食材；汤底额外计入教学负担，份量及营养不完全等效。地域与养殖方式差异显著。' },
  { id: 'cotton', title: '纺织品与虚拟水', url: 'https://waterwise.org.uk/virtual-water-footprint/', citation: 'Waterwise, Virtual Water Footprint', use: '原页称5400瓶水，未注明瓶容量；以每瓶0.5L假设得到2700L。本应用定义250g棉T恤并显式分配各工序。', limitation: '2700L不是单一实测工厂值。绿/蓝/灰水及工序分配均为教学假设，不代表2700L饮用水；洗涤另列。' },
  { id: 'gasoline', title: '汽油燃烧等价换算', url: 'https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references', citation: 'US EPA, Greenhouse Gas Equivalencies Calculator — Calculations and References', use: '8887g CO₂/US gallon，1 US gallon=3.785411784L。', limitation: '仅燃烧CO₂数值等价，不包含开采炼化，不表示实际省下汽油或认证抵消。' },
  { id: 'teaching', title: '本实验室情景假设清单', citation: 'Exploded Carbon 教学模型 v1 · 非实测数据库', use: '包装按所列克重×教学材料因子；配送为3km×15g CO₂e/km；电力为500g CO₂e/kWh。棉T恤工序与水分配、AI PUE/WUE/硬件摊销逐项披露。', limitation: '这些因子未经特定供应链核证，不能用于碳标签、企业盘查、抵消交易或跨产品排名。更低碳不保证更低水耗。' },
  { id: 'fate', title: '材料环境归趋：教学参考', citation: 'Exploded Carbon 环境归趋情景 · 非标准降解试验', use: '纸约2个月、棉约半年、PET约450年的常见科普量级仅作示意；PP/PE使用范围标签。', limitation: '具体时间未经本应用独立验证，取决于温湿度、氧气、光照和处置。塑料碎裂不等于完全生物降解；能耗、运输、软件不适用。' },
  { id: 'equivalents', title: '生态等价物的假设', citation: 'Exploded Carbon 教学换算约定', use: '塑料袋5g/个；成年冷杉固碳22kg CO₂/树·年仅作可见教学假设。', limitation: '未找到适用于特定树龄、地区的冷杉统一参数；树年不可解释为真实守住树木、造林或碳抵消。' },
];
export const boundaryText = '本工具各部件碳当量（g CO₂e）与水足迹参考公开生命周期评估（LCA）文献及明确教学假设构建，用于个人消费习惯的对比直觉教学；实际排放因产地、电网结构与供应链差异而浮动。不是认证碳标签。';
