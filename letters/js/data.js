/* مغامرة إنقاذ مملكة الحروف — المحتوى اللغوي
 * كل حرف: الشكل، الاسم، هل يتصل بما بعده، الكلمات المصوّرة (تبدأ بالحرف)،
 * وكلمات أمثلة لموقع الحرف في وسط الكلمة وآخرها.
 */
(function () {
  'use strict';
  var TAT = 'ـ'; // التطويل لإظهار الاتصال

  // الحروف التي لا تتصل بما بعدها
  var NON_JOIN = 'اأإآدذرزوؤةى';

  // [id, glyph, displayGlyph, name (للنطق), words[[word, emoji]], mid[word, emoji], end[word, emoji], traceStart]
  var RAW = [
    ['alif', 'أ', 'أ', 'أَلِف', [['أسد', '🦁'], ['أرنب', '🐰'], ['أناناس', '🍍'], ['أذن', '👂']], ['فأر', '🐭'], ['ملجأ', ''], 'top'],
    ['ba', 'ب', 'ب', 'باء', [['بطة', '🦆'], ['بقرة', '🐄'], ['بيت', '🏠'], ['بيضة', '🥚'], ['برتقالة', '🍊']], ['حبل', '🪢'], ['كلب', '🐶'], 'tr'],
    ['ta', 'ت', 'ت', 'تاء', [['تفاحة', '🍎'], ['تمساح', '🐊'], ['تاج', '👑'], ['تلفاز', '📺']], ['كتاب', '📖'], ['بيت', '🏠'], 'tr'],
    ['tha', 'ث', 'ث', 'ثاء', [['ثعلب', '🦊'], ['ثوم', '🧄'], ['ثلج', '❄️'], ['ثور', '🐂']], ['مثلث', '🔺'], ['ليث', '🦁'], 'tr'],
    ['jim', 'ج', 'ج', 'جيم', [['جمل', '🐫'], ['جزر', '🥕'], ['جبل', '⛰️'], ['جرس', '🔔'], ['جبن', '🧀']], ['نجمة', '⭐'], ['ثلج', '❄️'], 'tl'],
    ['ha', 'ح', 'ح', 'حاء', [['حصان', '🐴'], ['حوت', '🐋'], ['حليب', '🥛'], ['حلزون', '🐌'], ['حذاء', '👟']], ['بحر', '🌊'], ['ملح', '🧂'], 'tl'],
    ['kha', 'خ', 'خ', 'خاء', [['خروف', '🐑'], ['خيار', '🥒'], ['خبز', '🍞'], ['خيمة', '⛺'], ['خاتم', '💍']], ['نخلة', '🌴'], ['بطيخ', '🍉'], 'tl'],
    ['dal', 'د', 'د', 'دال', [['دب', '🐻'], ['دجاجة', '🐔'], ['دراجة', '🚲'], ['دلفين', '🐬'], ['دودة', '🐛']], ['هدية', '🎁'], ['يد', '✋'], 'tr'],
    ['dhal', 'ذ', 'ذ', 'ذال', [['ذئب', '🐺'], ['ذرة', '🌽'], ['ذبابة', '🪰']], ['حذاء', '👟'], ['لذيذ', '😋'], 'tr'],
    ['ra', 'ر', 'ر', 'راء', [['رجل', '👨'], ['راية', '🚩'], ['روبوت', '🤖'], ['ريشة', '🪶']], ['قرد', '🐒'], ['قمر', '🌕'], 'tr'],
    ['zay', 'ز', 'ز', 'زاي', [['زرافة', '🦒'], ['زهرة', '🌸'], ['زيتون', '🫒'], ['زبدة', '🧈']], ['جزر', '🥕'], ['خبز', '🍞'], 'tr'],
    ['sin', 'س', 'س', 'سين', [['سمكة', '🐟'], ['سيارة', '🚗'], ['ساعة', '⌚'], ['سلحفاة', '🐢'], ['سرير', '🛏️']], ['مسجد', '🕌'], ['شمس', '☀️'], 'tr'],
    ['shin', 'ش', 'ش', 'شين', [['شمس', '☀️'], ['شجرة', '🌳'], ['شمعة', '🕯️'], ['شاي', '🍵']], ['عشب', '🌿'], ['ريش', '🪶'], 'tr'],
    ['sad', 'ص', 'ص', 'صاد', [['صاروخ', '🚀'], ['صندوق', '📦'], ['صوص', '🐥'], ['صقر', '🦅']], ['عصفور', '🐦'], ['مقص', '✂️'], 'tr'],
    ['dad', 'ض', 'ض', 'ضاد', [['ضفدع', '🐸'], ['ضوء', '💡'], ['ضرس', '🦷']], ['بيضة', '🥚'], ['مريض', '🤒'], 'tr'],
    ['ta2', 'ط', 'ط', 'طاء', [['طائرة', '✈️'], ['طماطم', '🍅'], ['طاووس', '🦚'], ['طبل', '🥁']], ['بطة', '🦆'], ['قط', '🐱'], 'top'],
    ['za2', 'ظ', 'ظ', 'ظاء', [['ظرف', '✉️'], ['ظبي', '🦌'], ['ظفر', '💅']], ['نظارة', '👓'], ['حفظ', ''], 'top'],
    ['ain', 'ع', 'ع', 'عين', [['عنب', '🍇'], ['عين', '👁️'], ['عصفور', '🐦'], ['عسل', '🍯'], ['عنكبوت', '🕷️']], ['شمعة', '🕯️'], ['إصبع', '👆'], 'tr'],
    ['ghain', 'غ', 'غ', 'غين', [['غيمة', '☁️'], ['غوريلا', '🦍'], ['غصن', '🌿']], ['ببغاء', '🦜'], ['صمغ', ''], 'tr'],
    ['fa', 'ف', 'ف', 'فاء', [['فيل', '🐘'], ['فراشة', '🦋'], ['فراولة', '🍓'], ['فأر', '🐭'], ['فطر', '🍄']], ['سفينة', '🚢'], ['سيف', '🗡️'], 'tr'],
    ['qaf', 'ق', 'ق', 'قاف', [['قطة', '🐱'], ['قمر', '🌕'], ['قلم', '✏️'], ['قرد', '🐒'], ['قارب', '⛵']], ['بقرة', '🐄'], ['طبق', '🍽️'], 'tr'],
    ['kaf', 'ك', 'ك', 'كاف', [['كلب', '🐶'], ['كتاب', '📖'], ['كرة', '⚽'], ['كعكة', '🎂'], ['كرسي', '🪑']], ['سمكة', '🐟'], ['ديك', '🐓'], 'top'],
    ['lam', 'ل', 'ل', 'لام', [['ليمون', '🍋'], ['لحم', '🥩'], ['لسان', '👅'], ['ليل', '🌃']], ['قلم', '✏️'], ['جمل', '🐫'], 'top'],
    ['mim', 'م', 'م', 'ميم', [['موز', '🍌'], ['مفتاح', '🔑'], ['مسجد', '🕌'], ['مطر', '🌧️']], ['تمساح', '🐊'], ['قلم', '✏️'], 'tr'],
    ['nun', 'ن', 'ن', 'نون', [['نحلة', '🐝'], ['نمر', '🐯'], ['نجمة', '⭐'], ['نار', '🔥'], ['نملة', '🐜']], ['عنب', '🍇'], ['عين', '👁️'], 'tr'],
    ['ha2', 'ه', 'هـ', 'هاء', [['هدية', '🎁'], ['هاتف', '📱'], ['هلال', '🌙']], ['نهر', '🏞️'], ['وجه', '😊'], 'tr'],
    ['waw', 'و', 'و', 'واو', [['وردة', '🌹'], ['ولد', '👦'], ['ورقة', '🍃'], ['وعاء', '🥣']], ['حوت', '🐋'], ['دلو', '🪣'], 'tr'],
    ['ya', 'ي', 'ي', 'ياء', [['يد', '✋'], ['يقطين', '🎃'], ['يخت', '🛥️'], ['يويو', '🪀']], ['بيت', '🏠'], ['كرسي', '🪑'], 'tr']
  ];

  var FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ';

  // المجموعات المتشابهة شكلاً أو صوتاً — تُستخدم مشتتاتٍ في الأسئلة الأصعب
  var SIMILAR = [
    ['ba', 'ta', 'tha', 'nun', 'ya'], ['jim', 'ha', 'kha'], ['dal', 'dhal'], ['ra', 'zay', 'waw'],
    ['sin', 'shin'], ['sad', 'dad'], ['ta2', 'za2'], ['ain', 'ghain'], ['fa', 'qaf'],
    ['kaf', 'lam'], ['alif', 'lam'], ['mim', 'waw'], ['ha2', 'mim'], ['dad', 'za2'], ['sin', 'sad'], ['ta', 'ta2']
  ];

  var LETTERS = RAW.map(function (r, i) {
    var id = r[0], g = r[1];
    var joins = NON_JOIN.indexOf(g) < 0;
    var forms;
    if (id === 'ha2') forms = { iso: 'ه', ini: 'هـ', med: 'ـهـ', fin: 'ـه' };
    else if (joins) forms = { iso: g, ini: g + TAT, med: TAT + g + TAT, fin: TAT + g };
    else forms = { iso: g, ini: g, med: TAT + g, fin: TAT + g };
    var harakat = id === 'alif'
      ? [{ t: 'أَ', n: 'فتحة' }, { t: 'أُ', n: 'ضمة' }, { t: 'إِ', n: 'كسرة' }]
      : [{ t: g + FATHA, n: 'فتحة' }, { t: g + DAMMA, n: 'ضمة' }, { t: g + KASRA, n: 'كسرة' }];
    return {
      id: id, idx: i, ch: g, display: r[2], name: r[3],
      plainName: r[3].replace(/[ً-ْ]/g, ''),
      joins: joins, forms: forms, harakat: harakat,
      words: r[4].map(function (w) { return { w: w[0], e: w[1] }; }),
      mid: { w: r[5][0], e: r[5][1] }, end: { w: r[6][0], e: r[6][1] },
      traceStart: r[7], world: Math.floor(i / 4)
    };
  });

  var BY_ID = {};
  LETTERS.forEach(function (l) { BY_ID[l.id] = l; });

  var WORLDS = [
    { name: 'غابة الأشجار الخضراء', short: 'الغابة', icon: '🌳', theme: 'forest', c1: '#5fd36a', c2: '#1f8f4e', sky1: '#bff3c3', sky2: '#4fbf8a' },
    { name: 'صحراء الكثبان الذهبية', short: 'الصحراء', icon: '🐪', theme: 'desert', c1: '#ffd36b', c2: '#e08a2e', sky1: '#ffeab3', sky2: '#f7a54a' },
    { name: 'جزيرة البحر الأزرق', short: 'البحر', icon: '🐠', theme: 'sea', c1: '#5cc8ff', c2: '#1d6fd8', sky1: '#c4ecff', sky2: '#3aa0e8' },
    { name: 'جبال الثلج اللامعة', short: 'الثلج', icon: '⛄', theme: 'snow', c1: '#e8f6ff', c2: '#8fb8e8', sky1: '#eef8ff', sky2: '#9cc6f0' },
    { name: 'حديقة الحلوى الملونة', short: 'الحلوى', icon: '🍭', theme: 'candy', c1: '#ff9ad5', c2: '#d64fa0', sky1: '#ffe0f2', sky2: '#f78cc6' },
    { name: 'سماء النجوم الساحرة', short: 'النجوم', icon: '🌙', theme: 'space', c1: '#9a7bff', c2: '#3b2a8f', sky1: '#5b4bb8', sky2: '#1c1450' },
    { name: 'قلعة قوس قزح', short: 'القلعة', icon: '🏰', theme: 'rainbow', c1: '#ff7a7a', c2: '#7a5cff', sky1: '#fff3c4', sky2: '#ffb3d1' }
  ];
  WORLDS.forEach(function (w, i) { w.idx = i; w.letters = LETTERS.slice(i * 4, i * 4 + 4); });

  var GAMES = [
    { id: 'listen', name: 'استمع واختر', icon: '👂', desc: 'استمع إلى الصوت ثم اختر الحرف' },
    { id: 'catch', name: 'اصطد الحرف', icon: '🎈', desc: 'انقر على البالونات التي تحمل الحرف' },
    { id: 'match', name: 'طابق الصورة', icon: '🧩', desc: 'اسحب الحرف إلى الصورة المناسبة' },
    { id: 'complete', name: 'أكمل الكلمة', icon: '🔤', desc: 'اختر الحرف الناقص في الكلمة' },
    { id: 'trace', name: 'ارسم الحرف', icon: '✍️', desc: 'تتبّع الحرف بإصبعك من اليمين إلى اليسار' }
  ];

  var PRAISE = ['أحسنت!', 'رائع!', 'ممتاز يا بطل!', 'أنت مذهل!', 'عمل جميل!', 'برافو!', 'إجابة صحيحة!', 'هكذا يكون الأبطال!'];
  var ENCOURAGE = ['حاول مرة أخرى، أنت قادر!', 'لا بأس، فكّر قليلاً وجرّب ثانية', 'اقتربت! حاول مجدداً', 'لا تقلق، نتعلم معاً'];

  // ===== أدوات الكتابة العربية =====
  function joinsAfter(ch) { return !!ch && NON_JOIN.indexOf(ch) < 0 && ch !== ' '; }

  // كلمة مع إبراز حرف في موقع معين مع الحفاظ على اتصال الحروف (باستخدام ZWJ)
  function highlightWord(word, index, cls) {
    var Z = '‍';
    var pre = word.slice(0, index), ch = word.charAt(index), post = word.slice(index + 1);
    var preJoin = pre.length > 0 && joinsAfter(pre.charAt(pre.length - 1));
    var chJoin = post.length > 0 && joinsAfter(ch);
    return esc(pre) + (preJoin ? Z : '') +
      '<span class="' + (cls || 'hl') + '">' + (preJoin ? Z : '') + esc(ch) + (chJoin ? Z : '') + '</span>' +
      (chJoin ? Z : '') + esc(post);
  }

  // كلمة بحرف ناقص: يعيد أجزاء [قبل، بعد] مع التطويل المناسب لإظهار الاتصال
  function blankWord(word, index) {
    var pre = word.slice(0, index), ch = word.charAt(index), post = word.slice(index + 1);
    var preJoin = pre.length > 0 && joinsAfter(pre.charAt(pre.length - 1));
    var chJoin = post.length > 0 && joinsAfter(ch);
    return { pre: pre + (preJoin ? TAT : ''), post: (chJoin && post ? TAT : '') + post, preJoin: preJoin, chJoin: chJoin };
  }

  // موضع الحرف في الكلمة (أول ظهور بعد البداية للكلمات الوسطى)
  function findIndex(word, ch, fromEnd) {
    if (fromEnd) return word.lastIndexOf(ch);
    var i = word.indexOf(ch, 1);
    return i < 0 ? word.indexOf(ch) : i;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ===== عشوائية =====
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function similarOf(id) {
    var s = {};
    SIMILAR.forEach(function (g) { if (g.indexOf(id) >= 0) g.forEach(function (x) { if (x !== id) s[x] = 1; }); });
    return Object.keys(s);
  }

  // مشتتات: n حروف مختلفة عن الهدف، مع تفضيل المتشابهة عند hard
  function distractors(id, n, hard, exclude) {
    exclude = exclude || [];
    var out = [];
    if (hard) shuffle(similarOf(id)).forEach(function (x) { if (out.length < n && exclude.indexOf(x) < 0) out.push(x); });
    shuffle(LETTERS.map(function (l) { return l.id; })).forEach(function (x) {
      if (out.length < n && x !== id && out.indexOf(x) < 0 && exclude.indexOf(x) < 0) out.push(x);
    });
    return out.map(function (x) { return BY_ID[x]; });
  }

  // كلمة مصوّرة من حرف آخر لا تبدأ بحرف الهدف ولا تكرر صورة موجودة
  function wordFromOther(letter, usedEmoji) {
    var l = letter, w = shuffle(l.words).filter(function (x) { return x.e && usedEmoji.indexOf(x.e) < 0; })[0];
    return w || null;
  }

  window.HK = window.HK || {};
  HK.data = {
    LETTERS: LETTERS, BY_ID: BY_ID, WORLDS: WORLDS, GAMES: GAMES, PRAISE: PRAISE, ENCOURAGE: ENCOURAGE,
    TAT: TAT, NON_JOIN: NON_JOIN,
    highlightWord: highlightWord, blankWord: blankWord, findIndex: findIndex, joinsAfter: joinsAfter,
    shuffle: shuffle, pick: pick, distractors: distractors, similarOf: similarOf, wordFromOther: wordFromOther, esc: esc
  };
})();
