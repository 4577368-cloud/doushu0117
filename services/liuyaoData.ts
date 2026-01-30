
// 64 Hexagrams Data
// Binary key: Top -> Bottom (6 bits). 1=Yang, 0=Yin.
// Wait, standard is Bottom -> Top.
// Let's use array of 6 integers (0/1) for lookup, or a string key.

export interface Trigram {
    name: string;
    nature: string;
    element: string;
    binary: string; // "111" (Top to Bottom)
}

export const TRIGRAMS: Record<string, Trigram> = {
    '111': { name: '乾', nature: '天', element: '金', binary: '111' },
    '011': { name: '兑', nature: '泽', element: '金', binary: '011' },
    '101': { name: '离', nature: '火', element: '火', binary: '101' },
    '001': { name: '震', nature: '雷', element: '木', binary: '001' },
    '110': { name: '巽', nature: '风', element: '木', binary: '110' },
    '010': { name: '坎', nature: '水', element: '水', binary: '010' },
    '100': { name: '艮', nature: '山', element: '土', binary: '100' },
    '000': { name: '坤', nature: '地', element: '土', binary: '000' },
};

export interface HexagramData {
    name: string;
    symbol: string; // Unicode char
    description: string;
    description_vernacular: string;
}

// Key: "UpperBinary-LowerBinary" (e.g., "111-111" for Qian)
export const HEXAGRAM_DATA: Record<string, HexagramData> = {
    "111-111": { name: "乾为天", symbol: "䷀", description: "元亨利贞。", description_vernacular: "大吉大利，吉祥贞正。" },
    "000-000": { name: "坤为地", symbol: "䷁", description: "元亨，利牝马之贞。", description_vernacular: "大吉大利，像母马一样柔顺坚持则有利。" },
    "010-001": { name: "水雷屯", symbol: "䷂", description: "元亨利贞。勿用有攸往，利建侯。", description_vernacular: "万物始生，充满艰难险阻。不宜有所往，利于建立基业。" },
    "100-010": { name: "山水蒙", symbol: "䷃", description: "亨。匪我求童蒙，童蒙求我。", description_vernacular: "亨通。不是我求教于蒙昧的童子，而是蒙昧的童子求教于我。" },
    "010-111": { name: "水天需", symbol: "䷄", description: "有孚，光亨，贞吉。利涉大川。", description_vernacular: "有诚意，光明亨通，坚持正道则吉。利于涉越大河大川。" },
    "111-010": { name: "天水讼", symbol: "䷅", description: "有孚，窒惕，中吉，终凶。利见大人，不利涉大川。", description_vernacular: "虽有诚意，但受阻需警惕。中间吉利，终久凶险。利于拜见大人物，不利于涉越大河。" },
    "000-010": { name: "地水师", symbol: "䷆", description: "贞，丈人吉，无咎。", description_vernacular: "坚持正道，任用长者指挥则吉，无灾祸。" },
    "010-000": { name: "水地比", symbol: "䷇", description: "吉。原筮，元永贞，无咎。不宁方来，后夫凶。", description_vernacular: "吉利。推究占筮，大而永久坚持正道，无灾祸。不愿归顺的邦国也来朝，迟迟不来者有凶。" },
    "110-111": { name: "风天小畜", symbol: "䷈", description: "亨。密云不雨，自我西郊。", description_vernacular: "亨通。浓云密布而不下雨，云气从我西郊升起。" },
    "111-011": { name: "天泽履", symbol: "䷉", description: "履虎尾，不咥人，亨。", description_vernacular: "踩在老虎尾巴上，老虎不咬人，亨通。" },
    "000-111": { name: "地天泰", symbol: "䷊", description: "小往大来，吉，亨。", description_vernacular: "付出小，收获大，吉祥亨通。" },
    "111-000": { name: "天地否", symbol: "䷋", description: "否之匪人，不利君子贞，大往小来。", description_vernacular: "闭塞不通，非人世之道。不利于君子坚持正道，付出大，收获小。" },
    "111-101": { name: "天火同人", symbol: "䷌", description: "同人于野，亨。利涉大川，利君子贞。", description_vernacular: "在野外聚集众人，亨通。利于涉越大河，利于君子坚持正道。" },
    "101-111": { name: "火天大有", symbol: "䷍", description: "元亨。", description_vernacular: "大吉大利，亨通。" },
    "000-100": { name: "地山谦", symbol: "䷎", description: "亨，君子有终。", description_vernacular: "亨通，君子能够有始有终。" },
    "001-000": { name: "雷地豫", symbol: "䷏", description: "利建侯行师。", description_vernacular: "利于建立诸侯，行军打仗。" },
    "011-001": { name: "泽雷随", symbol: "䷐", description: "元亨利贞，无咎。", description_vernacular: "大吉大利，坚持正道，无灾祸。" },
    "100-110": { name: "山风蛊", symbol: "䷑", description: "元亨，利涉大川。先甲三日，后甲三日。", description_vernacular: "大亨通，利于涉越大河。甲日前三天和甲日后三天（指做事要周密筹划）。" },
    "000-011": { name: "地泽临", symbol: "䷒", description: "元亨利贞。至于八月有凶。", description_vernacular: "大吉大利，坚持正道。但到了八月会有凶险。" },
    "110-000": { name: "风地观", symbol: "䷓", description: "盥而不荐，有孚颙若。", description_vernacular: "祭祀时只洗手不献祭品，心怀诚意而庄严恭敬。" },
    "101-001": { name: "火雷噬嗑", symbol: "䷔", description: "亨。利用狱。", description_vernacular: "亨通。利于折断狱讼（判案）。" },
    "100-101": { name: "山火贲", symbol: "䷕", description: "亨。小利有攸往。", description_vernacular: "亨通。稍利于有所往。" },
    "100-000": { name: "山地剥", symbol: "䷖", description: "不利有攸往。", description_vernacular: "不利于有所往。" },
    "000-001": { name: "地雷复", symbol: "䷗", description: "亨。出入无疾，朋来无咎。反复其道，七日来复。利有攸往。", description_vernacular: "亨通。出入无病痛，朋友来无灾祸。返回正道，七日一来复。利于有所往。" },
    "111-001": { name: "天雷无妄", symbol: "䷘", description: "元亨利贞。其匪正有眚，不利有攸往。", description_vernacular: "大吉大利，坚持正道。如果不正就会有灾祸，不利于有所往。" },
    "100-111": { name: "山天大畜", symbol: "䷙", description: "利贞。不家食，吉。利涉大川。", description_vernacular: "利于坚持正道。不在家吃饭（指在外做事），吉利。利于涉越大河。" },
    "100-001": { name: "山雷颐", symbol: "䷚", description: "贞吉。观颐，自求口实。", description_vernacular: "坚持正道则吉。观察颐养之道，靠自己谋取口粮。" },
    "011-110": { name: "泽风大过", symbol: "䷛", description: "栋桡。利有攸往，亨。", description_vernacular: "房屋栋梁弯曲。利于有所往，亨通。" },
    "010-010": { name: "坎为水", symbol: "䷜", description: "习坎，有孚，维心亨，行有尚。", description_vernacular: "重重险陷，心怀诚信，内心亨通，行为高尚。" },
    "101-101": { name: "离为火", symbol: "䷝", description: "利贞，亨。畜牝牛，吉。", description_vernacular: "利于坚持正道，亨通。畜养母牛，吉利。" },
    "011-100": { name: "泽山咸", symbol: "䷞", description: "亨，利贞。取女吉。", description_vernacular: "亨通，利于坚持正道。娶妻吉利。" },
    "001-110": { name: "雷风恒", symbol: "䷟", description: "亨，无咎，利贞。利有攸往。", description_vernacular: "亨通，无灾祸，利于坚持正道。利于有所往。" },
    "111-100": { name: "天山遁", symbol: "䷠", description: "亨，小利贞。", description_vernacular: "亨通，稍利于坚持正道。" },
    "001-111": { name: "雷天大壮", symbol: "䷡", description: "利贞。", description_vernacular: "利于坚持正道。" },
    "101-000": { name: "火地晋", symbol: "䷢", description: "康侯用锡马蕃庶，昼日三接。", description_vernacular: "康侯受赐良马众多，一日之内三次受到接见。" },
    "000-101": { name: "地火明夷", symbol: "䷣", description: "利艰贞。", description_vernacular: "利于在艰难中坚持正道。" },
    "110-101": { name: "风火家人", symbol: "䷤", description: "利女贞。", description_vernacular: "利于女子坚持正道。" },
    "101-011": { name: "火泽睽", symbol: "䷥", description: "小事吉。", description_vernacular: "小事吉利。" },
    "010-100": { name: "水山蹇", symbol: "䷦", description: "利西南，不利东北。利见大人，贞吉。", description_vernacular: "利于西南方，不利于东北方。利于拜见大人物，坚持正道则吉。" },
    "001-010": { name: "雷水解", symbol: "䷧", description: "利西南。无所往，其来复吉。有攸往，夙吉。", description_vernacular: "利于西南方。如果没有什么可往的，返回来吉利。如果有所往，早去吉利。" },
    "100-011": { name: "山泽损", symbol: "䷨", description: "有孚，元吉，无咎，可贞。利有攸往。曷之用，二簋可用享。", description_vernacular: "有诚意，大吉，无灾祸，可以坚持正道。利于有所往。用什么祭祀？两簋食物即可。" },
    "110-001": { name: "风雷益", symbol: "䷩", description: "利有攸往，利涉大川。", description_vernacular: "利于有所往，利于涉越大河。" },
    "011-111": { name: "泽天夬", symbol: "䷪", description: "扬于王庭，孚号，有厉。告自邑，不利即戎。利有攸往。", description_vernacular: "在朝廷上宣扬，诚心号召，有危险。告知封邑，不利于动武。利于有所往。" },
    "111-110": { name: "天风姤", symbol: "䷫", description: "女壮，勿用取女。", description_vernacular: "女子强壮，不要娶这样的女子。" },
    "011-000": { name: "泽地萃", symbol: "䷬", description: "亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。", description_vernacular: "亨通。君王到宗庙祭祀，利于拜见大人物，亨通，利于坚持正道。用大牲畜祭祀吉利，利于有所往。" },
    "000-110": { name: "地风升", symbol: "䷭", description: "元亨。用见大人，勿恤。南征吉。", description_vernacular: "大亨通。拜见大人物，不必忧虑。向南征伐吉利。" },
    "011-010": { name: "泽水困", symbol: "䷮", description: "亨，贞，大人吉，无咎。有言不信。", description_vernacular: "亨通，坚持正道，大人物吉利，无灾祸。说的话没人相信。" },
    "010-110": { name: "水风井", symbol: "䷯", description: "改邑不改井，无丧无得。往来井井。汔至，亦未繘井，羸其瓶，凶。", description_vernacular: "改变城邑不改变水井，无失无得。往来汲水。井水快干了，绳索还没到井底，打破了瓶子，凶险。" },
    "011-101": { name: "泽火革", symbol: "䷰", description: "己日乃孚，元亨利贞，悔亡。", description_vernacular: "己日才建立信用，大吉大利，坚持正道，悔恨消失。" },
    "101-110": { name: "火风鼎", symbol: "䷱", description: "元吉，亨。", description_vernacular: "大吉，亨通。" },
    "001-001": { name: "震为雷", symbol: "䷲", description: "亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。", description_vernacular: "亨通。雷声传来恐惧不安，过后笑逐颜开。雷声震惊百里，手中的酒勺和祭酒不曾掉落。" },
    "100-100": { name: "艮为山", symbol: "䷳", description: "艮其背，不获其身；行其庭，不见其人。无咎。", description_vernacular: "止于背部，看不见身体；走在庭院，看不见人。无灾祸。" },
    "110-100": { name: "风山渐", symbol: "䷴", description: "女归吉，利贞。", description_vernacular: "女子出嫁吉利，利于坚持正道。" },
    "001-011": { name: "雷泽归妹", symbol: "䷵", description: "征凶，无攸利。", description_vernacular: "出征凶险，没有什么利处。" },
    "001-101": { name: "雷火丰", symbol: "䷶", description: "亨，王假之。勿忧，宜日中。", description_vernacular: "亨通，君王亲临。不必忧虑，适宜日中（似太阳当空）。" },
    "101-100": { name: "火山旅", symbol: "䷷", description: "小亨，旅贞吉。", description_vernacular: "小亨通，旅途坚持正道则吉。" },
    "110-110": { name: "巽为风", symbol: "䷸", description: "小亨，利有攸往，利见大人。", description_vernacular: "小亨通，利于有所往，利于拜见大人物。" },
    "011-011": { name: "兑为泽", symbol: "䷹", description: "亨，利贞。", description_vernacular: "亨通，利于坚持正道。" },
    "110-010": { name: "风水涣", symbol: "䷺", description: "亨。王假有庙，利涉大川，利贞。", description_vernacular: "亨通。君王到宗庙祭祀，利于涉越大河，利于坚持正道。" },
    "010-011": { name: "水泽节", symbol: "䷻", description: "亨。苦节不可贞。", description_vernacular: "亨通。过分节制不可坚持。" },
    "110-011": { name: "风泽中孚", symbol: "䷼", description: "豚鱼吉，利涉大川，利贞。", description_vernacular: "对待猪鱼也有诚信，吉利，利于涉越大河，利于坚持正道。" },
    "001-100": { name: "雷山小过", symbol: "䷽", description: "亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。", description_vernacular: "亨通，利于坚持正道。适合做小事，不适合做大事。飞鸟留下的声音，不宜向上宜向下，大吉。" },
    "010-101": { name: "水火既济", symbol: "䷾", description: "亨，小利贞，初吉终乱。", description_vernacular: "亨通，稍利于坚持正道，起初吉利，最终混乱。" },
    "101-010": { name: "火水未济", symbol: "䷿", description: "亨。小狐汔济，濡其尾，无攸利。", description_vernacular: "亨通。小狐狸快要渡过河，打湿了尾巴，没有什么利处。" }
};

export const getHexagram = (lines: number[]): HexagramData | null => {
    // lines: array of 6 integers (0 or 1). Index 0 is Bottom line.
    // We need to split into Lower (0-2) and Upper (3-5).
    // And construct binary string Top->Bottom for Trigram lookup.
    
    // Lower Trigram: lines[2], lines[1], lines[0]
    const lowerBin = `${lines[2]}${lines[1]}${lines[0]}`;
    // Upper Trigram: lines[5], lines[4], lines[3]
    const upperBin = `${lines[5]}${lines[4]}${lines[3]}`;
    
    const key = `${upperBin}-${lowerBin}`;
    return HEXAGRAM_DATA[key] || null;
};
