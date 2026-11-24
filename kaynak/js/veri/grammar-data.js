/* v1.1: Dilbilgisi başvuru kartları — zaman çizelgesi, yazım kuralları, fiil listeleri, gerund / infinitive.
   Müfredat maddeleri "ref" alanıyla bu kartlara bağlanır (ör. ref: 'tenses'). Metinler üç dillidir; İngilizce örnekler her dilde aynen kalır. */
(function () {
  const T = (tr, en, ar) => ({ tr, en, ar });
  // Zaman çizelgesi: 3 zaman × 4 görünüş. lvl = müfredatta ilk ele alındığı seviye (CEFR).
  const tenses = [
    { t: 'past', a: 'simple', name: 'Past Simple', lvl: 'A2', form: 'V2 (worked, went) · did not + V1 · Did … + V1?', pos: 'She worked yesterday.', neg: "She didn't work yesterday.", q: 'Did she work yesterday?', sig: 'yesterday, last week, ago, in 2010',
      use: T('Geçmişte belirli bir zamanda başlayıp bitmiş eylem.', 'A finished action at a specific time in the past.', 'فعل بدأ وانتهى في وقت محدد في الماضي.') },
    { t: 'past', a: 'cont', name: 'Past Continuous', lvl: 'B1', form: 'was / were + V-ing', pos: 'I was reading when you called.', neg: "I wasn't reading.", q: 'Were you reading?', sig: 'while, when, at 8 pm yesterday',
      use: T('Geçmişte belli bir anda süren eylem; çoğu zaman başka bir eylemle kesilir (arka plan).', 'An action in progress at a moment in the past, often interrupted by another action (background).', 'فعل كان مستمراً في لحظة من الماضي، وكثيراً ما يقطعه فعل آخر (الخلفية).') },
    { t: 'past', a: 'perf', name: 'Past Perfect', lvl: 'B1', form: 'had + V3', pos: 'The film had started when we arrived.', neg: "The film hadn't started.", q: 'Had the film started?', sig: 'before, after, already, by the time',
      use: T('Geçmişteki bir olaydan daha önce olan olay ("geçmişin geçmişi").', 'An event that happened before another past event ("the past of the past").', 'حدث وقع قبل حدث آخر في الماضي ("ماضي الماضي").') },
    { t: 'past', a: 'pcont', name: 'Past Perfect Continuous', lvl: 'B2', form: 'had been + V-ing', pos: 'She had been waiting for an hour before the bus came.', neg: "She hadn't been waiting long.", q: 'Had she been waiting long?', sig: 'for, since, before, how long',
      use: T('Geçmişteki bir ana kadar bir süredir devam etmiş eylem.', 'An action that had been continuing for some time up to a point in the past.', 'فعل استمر مدةً حتى لحظة معينة في الماضي.') },
    { t: 'present', a: 'simple', name: 'Present Simple', lvl: 'Pre-A1', form: 'V1 / V1 + -s (he, she, it) · do / does not + V1 · Do / Does … + V1?', pos: 'He works in a bank.', neg: "He doesn't work in a bank.", q: 'Does he work in a bank?', sig: 'always, usually, often, every day, on Mondays',
      use: T('Alışkanlıklar, rutinler, genel gerçekler ve tarifeler.', 'Habits, routines, general truths and timetables.', 'العادات والروتين والحقائق العامة والجداول الزمنية.') },
    { t: 'present', a: 'cont', name: 'Present Continuous', lvl: 'Pre-A1', form: 'am / is / are + V-ing', pos: 'They are playing football now.', neg: "They aren't playing now.", q: 'Are they playing now?', sig: 'now, at the moment, today, Look!',
      use: T('Şu anda süren ya da geçici durumlar; kesinleşmiş yakın gelecek planları.', 'Actions happening now or temporary situations; fixed near-future arrangements.', 'أفعال تحدث الآن أو أوضاع مؤقتة، والمواعيد المرتبة في المستقبل القريب.') },
    { t: 'present', a: 'perf', name: 'Present Perfect', lvl: 'A2', form: 'have / has + V3', pos: "I have visited London twice.", neg: "I haven't visited London.", q: 'Have you ever visited London?', sig: 'ever, never, just, already, yet, for, since',
      use: T('Geçmişte zamanı belirtilmeyen deneyim; sonucu şimdi görülen ya da hâlâ süren durum.', 'Experience at an unspecified past time; a past action with a present result, or a situation that still continues.', 'تجربة في وقت غير محدد من الماضي، أو فعل ماضٍ نتيجته ظاهرة الآن، أو حالة ما زالت مستمرة.') },
    { t: 'present', a: 'pcont', name: 'Present Perfect Continuous', lvl: 'B1', form: 'have / has been + V-ing', pos: "I've been learning English for three years.", neg: "I haven't been sleeping well.", q: 'How long have you been waiting?', sig: 'for, since, how long, all day, lately',
      use: T('Geçmişte başlayıp şimdiye kadar süren eylem; sürenin ya da sürecin vurgulanması.', 'An action that started in the past and continues up to now; emphasis on duration or process.', 'فعل بدأ في الماضي واستمر حتى الآن، مع التركيز على المدة أو العملية.') },
    { t: 'future', a: 'simple', name: 'Future Simple (will) / be going to', lvl: 'A2', form: 'will + V1 · am / is / are going to + V1', pos: "I'll help you. · It's going to rain.", neg: "I won't be late. · I'm not going to buy it.", q: 'Will you come? · Are you going to study?', sig: 'tomorrow, next week, soon, in 2030',
      use: T('will: anlık karar, söz, tahmin. going to: önceden verilmiş karar (plan) ve kanıta dayalı tahmin.', 'will: instant decisions, promises, predictions. going to: plans decided earlier and predictions based on evidence.', 'will‏: القرار اللحظي والوعد والتوقع. going to‏: الخطط المقررة مسبقاً والتوقع المبني على دليل.') },
    { t: 'future', a: 'cont', name: 'Future Continuous', lvl: 'B1', form: 'will be + V-ing', pos: 'This time tomorrow I will be flying to Rome.', neg: "I won't be working on Sunday.", q: 'Will you be using the car tonight?', sig: 'this time tomorrow, at 10 am tomorrow',
      use: T('Gelecekte belli bir anda sürüyor olacak eylem.', 'An action that will be in progress at a moment in the future.', 'فعل سيكون مستمراً في لحظة معينة من المستقبل.') },
    { t: 'future', a: 'perf', name: 'Future Perfect', lvl: 'B2', form: 'will have + V3', pos: 'By June I will have finished the course.', neg: "I won't have finished by then.", q: 'Will you have finished by June?', sig: 'by then, by the time, by 2030',
      use: T('Gelecekteki bir ana kadar tamamlanmış olacak eylem.', 'An action that will be completed before a point in the future.', 'فعل سيكون قد اكتمل قبل لحظة معينة في المستقبل.') },
    { t: 'future', a: 'pcont', name: 'Future Perfect Continuous', lvl: 'B2', form: 'will have been + V-ing', pos: 'By May I will have been working here for ten years.', neg: "I won't have been working here long.", q: 'How long will you have been working here?', sig: 'by … for, how long',
      use: T('Gelecekteki bir ana kadar ne kadar süredir devam etmiş olacağını gösterir.', 'Shows how long an action will have been continuing by a point in the future.', 'يبيّن المدة التي سيكون الفعل قد استمرها حتى لحظة في المستقبل.') },
  ];

  // Sık kullanılan düzensiz fiiller (V1 – V2 – V3), anlam ve ilk görüldüğü seviye
  const IRR = `be|was / were|been|olmak|يكون|A1
have|had|had|sahip olmak|يملك|A1
do|did|done|yapmak|يفعل|A1
go|went|gone|gitmek|يذهب|A1
get|got|got (US gotten)|almak, elde etmek|يحصل على|A1
make|made|made|yapmak, üretmek|يصنع|A1
say|said|said|söylemek|يقول|A1
see|saw|seen|görmek|يرى|A1
come|came|come|gelmek|يأتي|A1
take|took|taken|almak, götürmek|يأخذ|A1
know|knew|known|bilmek|يعرف|A1
think|thought|thought|düşünmek|يفكر|A1
give|gave|given|vermek|يعطي|A1
find|found|found|bulmak|يجد|A1
tell|told|told|anlatmak, söylemek|يخبر|A1
become|became|become|olmak (dönüşmek)|يصبح|A2
leave|left|left|ayrılmak, bırakmak|يغادر|A1
feel|felt|felt|hissetmek|يشعر|A1
put|put|put|koymak|يضع|A1
bring|brought|brought|getirmek|يُحضر|A1
begin|began|begun|başlamak|يبدأ|A1
keep|kept|kept|tutmak, saklamak|يحتفظ|A2
hold|held|held|tutmak|يمسك|A2
write|wrote|written|yazmak|يكتب|A1
stand|stood|stood|ayakta durmak|يقف|A1
hear|heard|heard|duymak|يسمع|A1
let|let|let|izin vermek|يسمح|A2
mean|meant|meant|anlamına gelmek|يعني|A1
meet|met|met|tanışmak, buluşmak|يقابل|A1
run|ran|run|koşmak|يركض|A1
pay|paid|paid|ödemek|يدفع|A1
sit|sat|sat|oturmak|يجلس|A1
speak|spoke|spoken|konuşmak|يتكلم|A1
lie|lay|lain|uzanmak|يستلقي|B1
lead|led|led|yol göstermek, liderlik etmek|يقود|B1
read|read|read|okumak|يقرأ|A1
grow|grew|grown|büyümek, yetiştirmek|ينمو|A2
lose|lost|lost|kaybetmek|يخسر|A2
fall|fell|fallen|düşmek|يسقط|A2
send|sent|sent|göndermek|يرسل|A1
build|built|built|inşa etmek|يبني|A2
understand|understood|understood|anlamak|يفهم|A1
draw|drew|drawn|çizmek|يرسم|A1
break|broke|broken|kırmak|يكسر|A2
spend|spent|spent|harcamak, geçirmek|يقضي، ينفق|A2
cut|cut|cut|kesmek|يقطع|A2
rise|rose|risen|yükselmek|يرتفع|B1
drive|drove|driven|araba sürmek|يقود سيارة|A1
buy|bought|bought|satın almak|يشتري|A1
wear|wore|worn|giymek|يرتدي|A1
choose|chose|chosen|seçmek|يختار|A2
seek|sought|sought|aramak|يسعى|C1
throw|threw|thrown|fırlatmak|يرمي|A2
catch|caught|caught|yakalamak|يمسك، يلتقط|A2
deal|dealt|dealt|ilgilenmek|يتعامل|B1
win|won|won|kazanmak|يفوز|A2
forget|forgot|forgotten|unutmak|ينسى|A1
sell|sold|sold|satmak|يبيع|A1
fight|fought|fought|dövüşmek, mücadele etmek|يقاتل|B1
teach|taught|taught|öğretmek|يعلّم|A1
eat|ate|eaten|yemek|يأكل|A1
drink|drank|drunk|içmek|يشرب|A1
sleep|slept|slept|uyumak|ينام|A1
swim|swam|swum|yüzmek|يسبح|A1
sing|sang|sung|şarkı söylemek|يغني|A1
fly|flew|flown|uçmak|يطير|A2
ride|rode|ridden|binmek, sürmek|يركب|A1
wake|woke|woken|uyanmak|يستيقظ|A2
steal|stole|stolen|çalmak|يسرق|B1
shake|shook|shaken|sallamak|يهزّ|B1
hide|hid|hidden|saklamak, saklanmak|يختبئ|B1
bite|bit|bitten|ısırmak|يعضّ|B1
blow|blew|blown|üflemek, esmek|ينفخ، تهبّ|B1
freeze|froze|frozen|donmak|يتجمد|B1
forgive|forgave|forgiven|affetmek|يسامح|B1
hang|hung|hung|asmak|يعلّق|B1
shoot|shot|shot|ateş etmek|يطلق النار|B1
shut|shut|shut|kapatmak|يُغلق|B1
hit|hit|hit|vurmak|يضرب|A2
hurt|hurt|hurt|acıtmak, yaralamak|يؤذي|A2
set|set|set|ayarlamak, koymak|يضبط|B1
cost|cost|cost|mal olmak|يكلّف|A2
feed|fed|fed|beslemek|يُطعم|B1
fit|fit|fit|uymak|يلائم|B1
lend|lent|lent|ödünç vermek|يُقرض|A2
light|lit|lit|yakmak|يُشعل|B1
mistake|mistook|mistaken|yanılmak, karıştırmak|يخطئ|B2
ring|rang|rung|çalmak (zil)|يرنّ|A2
shine|shone|shone|parlamak|يلمع|B1
sink|sank|sunk|batmak|يغرق|B2
spread|spread|spread|yaymak|ينشر|B2
strike|struck|struck|vurmak, çarpmak|يضرب|B2
swear|swore|sworn|yemin etmek|يُقسم|B2
tear|tore|torn|yırtmak|يمزّق|B2
bend|bent|bent|bükmek|يثني|B2
bet|bet|bet|bahse girmek|يراهن|B2
bind|bound|bound|bağlamak|يربط|C1
breed|bred|bred|yetiştirmek (hayvan)|يربّي|C1
cling|clung|clung|sıkıca tutunmak|يتشبث|C1
creep|crept|crept|sessizce sokulmak|يزحف|C1
forbid|forbade|forbidden|yasaklamak|يمنع|B2
forecast|forecast|forecast|tahmin etmek|يتنبأ|B2
overcome|overcame|overcome|üstesinden gelmek|يتغلب على|B2
undertake|undertook|undertaken|üstlenmek|يتعهّد|C1
withdraw|withdrew|withdrawn|geri çekmek|يسحب|B2`.split('\n').map((l) => { const [v1, v2, v3, tr, ar, lvl] = l.split('|'); return { v1, v2, v3, tr, ar, lvl }; });

  // Sık kullanılan düzenli fiiller (V2 = V3)
  const REG = `work|worked|çalışmak|يعمل|A1
play|played|oynamak|يلعب|A1
watch|watched|izlemek|يشاهد|A1
listen|listened|dinlemek|يستمع|A1
live|lived|yaşamak|يعيش|A1
like|liked|sevmek, hoşlanmak|يحب|A1
love|loved|sevmek|يحب|A1
want|wanted|istemek|يريد|A1
need|needed|ihtiyaç duymak|يحتاج|A1
start|started|başlamak|يبدأ|A1
finish|finished|bitirmek|يُنهي|A1
open|opened|açmak|يفتح|A1
close|closed|kapatmak|يُغلق|A1
call|called|aramak, çağırmak|يتصل، ينادي|A1
help|helped|yardım etmek|يساعد|A1
ask|asked|sormak|يسأل|A1
answer|answered|cevaplamak|يجيب|A1
talk|talked|konuşmak|يتحدث|A1
walk|walked|yürümek|يمشي|A1
cook|cooked|yemek pişirmek|يطبخ|A1
clean|cleaned|temizlemek|ينظّف|A1
wash|washed|yıkamak|يغسل|A1
visit|visited|ziyaret etmek|يزور|A1
travel|travelled (US traveled)|seyahat etmek|يسافر|A1
study|studied|ders çalışmak|يدرس|A1
try|tried|denemek|يحاول|A1
carry|carried|taşımak|يحمل|A2
cry|cried|ağlamak|يبكي|A2
marry|married|evlenmek|يتزوج|A2
worry|worried|endişelenmek|يقلق|A2
stop|stopped|durmak|يتوقف|A1
plan|planned|planlamak|يخطط|A2
drop|dropped|düşürmek|يُسقط|A2
prefer|preferred|tercih etmek|يفضّل|A2
arrive|arrived|varmak|يصل|A1
decide|decided|karar vermek|يقرر|A2
move|moved|taşınmak, hareket etmek|ينتقل|A1
change|changed|değiştirmek|يغيّر|A1
enjoy|enjoyed|keyif almak|يستمتع|A1
stay|stayed|kalmak|يبقى|A1
believe|believed|inanmak|يصدّق|A2
remember|remembered|hatırlamak|يتذكر|A1
learn|learned / learnt|öğrenmek|يتعلم|A1
use|used|kullanmak|يستخدم|A1
look|looked|bakmak|ينظر|A1
wait|waited|beklemek|ينتظر|A1
happen|happened|olmak, meydana gelmek|يحدث|A2
dance|danced|dans etmek|يرقص|A1
agree|agreed|katılmak, aynı fikirde olmak|يوافق|A2
admit|admitted|kabul etmek|يعترف|B1`.split('\n').map((l) => { const [v1, v2, tr, ar, lvl] = l.split('|'); return { v1, v2, tr, ar, lvl }; });

  const R = (rule, ex) => ({ rule, ex });
  const cards = {
    tenses: { icon: 'clock', title: T('Zaman çizelgesi: geçmiş – şimdi – gelecek', 'Timeline: past – present – future', 'الخط الزمني: الماضي – الحاضر – المستقبل'), lvl: 'Pre-A1 – B2', kind: 'timeline',
      intro: T('İngilizcede her zaman (geçmiş, şimdi, gelecek) dört görünüşle kullanılır: simple, continuous, perfect ve perfect continuous. Satırlar zamanı, sütunlar görünüşü gösterir; bir hücreye dokunarak kuralı, örneği ve çizelgedeki yerini görün.', 'In English every time (past, present, future) is used with four aspects: simple, continuous, perfect and perfect continuous. Rows show the time and columns the aspect; tap a cell to see the rule, examples and its place on the timeline.', 'في الإنجليزية يُستخدم كل زمن (الماضي والحاضر والمستقبل) بأربعة جوانب: simple وcontinuous وperfect وperfect continuous. تمثل الصفوف الزمن والأعمدة الجانب؛ اضغط على خلية لترى القاعدة والأمثلة وموضعها على الخط الزمني.') },
    a_an: { icon: 'book', title: T('a / an / the — tanımlıklar', 'a / an / the — articles', 'a / an / the — أدوات التعريف والتنكير'), lvl: 'Pre-A1 – A1',
      rules: [
        R(T('a: ünsüz SESİYLE başlayan sözcükten önce.', 'a: before a word that begins with a consonant SOUND.', 'a‏: قبل كلمة تبدأ بصوت ساكن.'), 'a book, a car, a university /juː/, a European /jʊə/, a one-way ticket /w/'),
        R(T('an: ünlü SESİYLE başlayan sözcükten önce.', 'an: before a word that begins with a vowel SOUND.', 'an‏: قبل كلمة تبدأ بصوت متحرك.'), 'an apple, an egg, an hour /aʊə/, an honest man, an MP /em/'),
        R(T('Karar harfe göre değil sese göre verilir: yazılışı ünlüyle başlasa da ünsüz sesle okunuyorsa "a" kullanılır.', 'The choice depends on sound, not spelling: if a word is spelt with a vowel but pronounced with a consonant sound, use "a".', 'يُحدَّد الاختيار بالصوت لا بالكتابة: إذا كُتبت الكلمة بحرف متحرك ونُطقت بصوت ساكن تُستخدم "a".'), 'a uniform · an umbrella · a user · an X-ray'),
        R(T('a / an: tekil, sayılabilen ve ilk kez söz edilen isim. the: bilinen, daha önce söz edilen ya da tek olan şey.', 'a / an: a singular countable noun mentioned for the first time. the: something known, already mentioned or unique.', 'a / an‏: اسم مفرد معدود يُذكر لأول مرة. the‏: شيء معروف أو سبق ذكره أو فريد.'), 'I saw a dog. The dog was black. · the sun, the moon'),
        R(T('Çoğul ve sayılamayan isimlerde a / an kullanılmaz; genel anlamda tanımlık da kullanılmaz.', 'No a / an with plural or uncountable nouns; no article at all in general meaning.', 'لا تُستخدم a / an مع الجمع وغير المعدود، ولا تُستخدم أداة أصلاً في المعنى العام.'), 'I like music. · Dogs are friendly. · Water is important.'),
        R(T('Meslekler a / an ile söylenir.', 'Jobs are used with a / an.', 'تُذكر المهن مع a / an.'), 'She is a doctor. · He is an engineer.'),
      ] },
    spell_s: { icon: 'edit', title: T('-s / -es / -ies yazım kuralları (çoğul ve 3. tekil)', '-s / -es / -ies spelling rules (plurals and third person)', 'قواعد كتابة -s / -es / -ies (الجمع والغائب المفرد)'), lvl: 'Pre-A1',
      rules: [
        R(T('Çoğu sözcüğe -s eklenir.', 'Add -s to most words.', 'تُضاف -s إلى معظم الكلمات.'), 'book → books · work → works · play → plays'),
        R(T('-s, -ss, -sh, -ch, -x, -o ile bitenlere -es eklenir.', 'Add -es after -s, -ss, -sh, -ch, -x, -o.', 'تُضاف -es بعد -s و-ss و-sh و-ch و-x و-o.'), 'bus → buses · class → classes · watch → watches · box → boxes · go → goes · potato → potatoes'),
        R(T('Ünsüz + y ile bitenlerde y düşer, -ies eklenir.', 'Consonant + y: drop y, add -ies.', 'ساكن + y‏: تُحذف y وتُضاف -ies.'), 'baby → babies · study → studies · fly → flies'),
        R(T('Ünlü + y ile bitenlere yalnızca -s eklenir.', 'Vowel + y: just add -s.', 'متحرك + y‏: تُضاف -s فقط.'), 'day → days · boy → boys · play → plays'),
        R(T('-f / -fe ile bitenlerin çoğu -ves olur (istisna: roof → roofs).', 'Most words ending in -f / -fe become -ves (exception: roof → roofs).', 'معظم الكلمات المنتهية بـ -f / -fe تصبح -ves (باستثناء roof → roofs).'), 'knife → knives · leaf → leaves · wife → wives'),
        R(T('Düzensiz çoğullar ezberlenir.', 'Irregular plurals must be learned.', 'تُحفظ صيغ الجمع الشاذة.'), 'man → men · woman → women · child → children · foot → feet · tooth → teeth · person → people · mouse → mice'),
        R(T('Telaffuz: /s/ (books, works), /z/ (pens, plays), /ɪz/ (boxes, watches).', 'Pronunciation: /s/ (books, works), /z/ (pens, plays), /ɪz/ (boxes, watches).', 'النطق: /s/ ‏(books وworks)، و/z/ ‏(pens وplays)، و/ɪz/ ‏(boxes وwatches).'), 'cats /s/ · dogs /z/ · horses /ɪz/'),
      ] },
    spell_ed: { icon: 'edit', title: T('-d / -ed / -ied yazım ve okunuş kuralları (Past Simple)', '-d / -ed / -ied spelling and pronunciation (Past Simple)', 'قواعد كتابة -d / -ed / -ied ونطقها (Past Simple)'), lvl: 'A2',
      rules: [
        R(T('Çoğu düzenli fiile -ed eklenir.', 'Add -ed to most regular verbs.', 'تُضاف -ed إلى معظم الأفعال القياسية.'), 'work → worked · play → played · watch → watched'),
        R(T('-e ile biten fiillere yalnızca -d eklenir.', 'Verbs ending in -e: add only -d.', 'الأفعال المنتهية بـ -e تُضاف إليها -d فقط.'), 'live → lived · like → liked · dance → danced · agree → agreed'),
        R(T('Ünsüz + y ile bitenlerde y düşer, -ied eklenir.', 'Consonant + y: drop y, add -ied.', 'ساكن + y‏: تُحذف y وتُضاف -ied.'), 'study → studied · try → tried · carry → carried · cry → cried'),
        R(T('Ünlü + y ile bitenlere -ed eklenir.', 'Vowel + y: add -ed.', 'متحرك + y‏: تُضاف -ed.'), 'play → played · stay → stayed · enjoy → enjoyed'),
        R(T('Tek heceli, ünsüz–ünlü–ünsüz ile bitenlerde son ünsüz ikilenir (-w, -x, -y ikilenmez: fix → fixed, snow → snowed).', 'One-syllable verbs ending consonant–vowel–consonant: double the last consonant (-w, -x, -y are not doubled: fix → fixed, snow → snowed).', 'الأفعال ذات المقطع الواحد المنتهية بساكن–متحرك–ساكن: يُضاعَف الساكن الأخير (لا تُضاعَف -w و-x و-y‏: fix → fixed وsnow → snowed).'), 'stop → stopped · plan → planned · drop → dropped'),
        R(T('İki heceli ve vurgusu son hecede olanlarda da ikilenir; vurgu ilk hecedeyse ikilenmez (visit → visited, open → opened).', 'Two-syllable verbs stressed on the last syllable also double; if the stress is on the first syllable they do not (visit → visited, open → opened).', 'وتُضاعَف كذلك في الأفعال ذات المقطعين المنبورة على المقطع الأخير، ولا تُضاعَف إذا كان النبر على المقطع الأول (visit → visited وopen → opened).'), 'prefer → preferred · admit → admitted'),
        R(T('İngiliz yazımında -l ikilenir; Amerikan yazımında ikilenmez.', 'British spelling doubles -l; American spelling does not.', 'تُضاعَف -l في الكتابة البريطانية ولا تُضاعَف في الأمريكية.'), 'travel → travelled (UK) / traveled (US)'),
        R(T('Okunuş: /t/ sert ünsüzden sonra, /d/ yumuşak ünsüz ve ünlüden sonra, /ɪd/ t veya d sesinden sonra.', 'Pronunciation: /t/ after voiceless sounds, /d/ after voiced sounds and vowels, /ɪd/ after t or d.', 'النطق: /t/ بعد الأصوات المهموسة، و/d/ بعد الأصوات المجهورة والمتحركات، و/ɪd/ بعد t أو d.'), 'worked /t/ · watched /t/ · played /d/ · lived /d/ · wanted /ɪd/ · needed /ɪd/'),
      ] },
    spell_ing: { icon: 'edit', title: T('-ing yazım kuralları', '-ing spelling rules', 'قواعد كتابة -ing'), lvl: 'Pre-A1',
      rules: [
        R(T('Çoğu fiile -ing eklenir.', 'Add -ing to most verbs.', 'تُضاف -ing إلى معظم الأفعال.'), 'read → reading · play → playing · go → going'),
        R(T('Sessiz -e düşer (istisna: see → seeing, be → being).', 'Drop the silent -e (exceptions: see → seeing, be → being).', 'تُحذف -e الصامتة (باستثناء see → seeing وbe → being).'), 'make → making · write → writing · come → coming'),
        R(T('-ie, -y olur.', '-ie changes to -y.', 'تتحول -ie إلى -y.'), 'lie → lying · die → dying · tie → tying'),
        R(T('Ünsüz–ünlü–ünsüz ile biten tek hecelilerde son ünsüz ikilenir.', 'Double the final consonant after consonant–vowel–consonant in one-syllable verbs.', 'يُضاعَف الساكن الأخير في الأفعال ذات المقطع الواحد المنتهية بساكن–متحرك–ساكن.'), 'run → running · swim → swimming · sit → sitting · stop → stopping'),
        R(T('-w, -x, -y ikilenmez.', '-w, -x, -y are never doubled.', 'لا تُضاعَف -w و-x و-y.'), 'snow → snowing · fix → fixing · play → playing'),
      ] },
    compare: { icon: 'edit', title: T('Karşılaştırma: -er / -est, more / most', 'Comparison: -er / -est, more / most', 'المقارنة: -er / -est وmore / most'), lvl: 'A2',
      rules: [
        R(T('Tek heceli sıfatlara -er / -est eklenir.', 'One-syllable adjectives take -er / -est.', 'تُضاف -er / -est إلى الصفات ذات المقطع الواحد.'), 'tall → taller → the tallest · cheap → cheaper → the cheapest'),
        R(T('-e ile bitenlere -r / -st eklenir.', 'Adjectives ending in -e take -r / -st.', 'الصفات المنتهية بـ -e تُضاف إليها -r / -st.'), 'nice → nicer → the nicest · large → larger → the largest'),
        R(T('Ünsüz–ünlü–ünsüz ile bitenlerde son ünsüz ikilenir.', 'Double the final consonant after consonant–vowel–consonant.', 'يُضاعَف الساكن الأخير بعد ساكن–متحرك–ساكن.'), 'big → bigger → the biggest · hot → hotter → the hottest'),
        R(T('Ünsüz + y ile bitenlerde -ier / -iest.', 'Consonant + y: -ier / -iest.', 'ساكن + y‏: -ier / -iest.'), 'happy → happier → the happiest · easy → easier → the easiest'),
        R(T('İki ve daha çok heceli sıfatlarda more / most.', 'Longer adjectives use more / most.', 'الصفات الأطول تستخدم more / most.'), 'expensive → more expensive → the most expensive'),
        R(T('Düzensiz biçimler.', 'Irregular forms.', 'الصيغ الشاذة.'), 'good → better → the best · bad → worse → the worst · far → further / farther → the furthest'),
      ] },
    gerund: { icon: 'book', title: T('Gerund (-ing) ve infinitive (to + fiil)', 'Gerunds (-ing) and infinitives (to + verb)', 'Gerund ‏(-ing) وInfinitive ‏(to + فعل)'), lvl: 'A1 – B2',
      rules: [
        R(T('Bu fiillerden sonra -ing gelir.', 'These verbs are followed by -ing.', 'يأتي بعد هذه الأفعال -ing.'), 'enjoy, like, love, hate, don\'t mind, finish, avoid, suggest, keep, practise, imagine, miss, consider, can\'t stand · I enjoy reading.'),
        R(T('Bu fiillerden sonra to + fiil gelir.', 'These verbs are followed by to + verb.', 'يأتي بعد هذه الأفعال to + فعل.'), 'want, would like, decide, hope, plan, need, learn, agree, promise, refuse, manage, offer, expect, afford · She decided to leave.'),
        R(T('Edattan sonra her zaman -ing gelir.', 'After a preposition always use -ing.', 'بعد حرف الجر تأتي -ing دائماً.'), "I'm good at swimming. · Thanks for helping. · Before leaving, … · I'm interested in learning."),
        R(T('Özne olarak -ing kullanılır.', 'Use -ing as the subject of a sentence.', 'تُستخدم -ing فاعلاً في الجملة.'), 'Swimming is good for you. · Learning English takes time.'),
        R(T('Anlamı değişen fiiller: stop, remember, forget, try, regret. stop + -ing: bırakmak; stop + to: bir şey yapmak için durmak. remember + to: yapmayı unutmamak; remember + -ing: yaptığını hatırlamak.', 'Verbs that change meaning: stop, remember, forget, try, regret. stop + -ing: give something up; stop + to: pause in order to do something. remember + to: not forget to do; remember + -ing: recall doing.', 'أفعال يتغير معناها: stop وremember وforget وtry وregret. stop + -ing‏: الإقلاع عن الشيء؛ stop + to‏: التوقف لفعل شيء. remember + to‏: عدم نسيان فعل الشيء؛ remember + -ing‏: تذكّر أنه فعله.'), 'He stopped smoking. ≠ He stopped to smoke. · Remember to lock the door. ≠ I remember locking the door.'),
        R(T('Anlam değişmeden ikisi de kullanılabilir.', 'Both forms with little change in meaning.', 'يُستخدم الشكلان دون تغيّر يُذكر في المعنى.'), 'begin, start, continue, prefer · It started raining / to rain.'),
        R(T('Fiil + nesne + to: tell, ask, want, allow; let / make + nesne + yalın fiil.', 'Verb + object + to: tell, ask, want, allow; let / make + object + bare verb.', 'فعل + مفعول + to‏: tell وask وwant وallow؛ وlet / make + مفعول + فعل مجرد.'), 'She asked me to wait. · They let us leave early. · He made me laugh.'),
      ] },
    irregular: { icon: 'book', title: T('Düzensiz fiiller (V1 – V2 – V3)', 'Irregular verbs (V1 – V2 – V3)', 'الأفعال الشاذة (V1 – V2 – V3)'), lvl: 'A1 – C1', kind: 'irregular',
      intro: T('V2 Past Simple\'da, V3 (past participle) perfect zamanlarda ve edilgen çatıda kullanılır. Kalıplar: V2 = V3 (buy – bought – bought), üçü aynı (put – put – put), üçü farklı (go – went – gone).', 'V2 is used in the Past Simple; V3 (past participle) in perfect tenses and the passive. Patterns: V2 = V3 (buy – bought – bought), all the same (put – put – put), all different (go – went – gone).', 'يُستخدم V2 في Past Simple، وV3 ‏(past participle) في الأزمنة التامة والمبني للمجهول. الأنماط: V2 = V3 ‏(buy – bought – bought)، والثلاثة متشابهة (put – put – put)، والثلاثة مختلفة (go – went – gone).') },
    regular: { icon: 'book', title: T('Sık kullanılan düzenli fiiller', 'Common regular verbs', 'الأفعال القياسية الشائعة'), lvl: 'A1 – B1', kind: 'regular',
      intro: T('Düzenli fiillerde V2 ve V3 aynıdır ve -d / -ed / -ied ile yapılır (yazım için "-d / -ed / -ied" kartına bakın).', 'In regular verbs V2 and V3 are the same and are formed with -d / -ed / -ied (see the "-d / -ed / -ied" card for spelling).', 'في الأفعال القياسية يتطابق V2 وV3 ويُصاغان بـ -d / -ed / -ied (انظر بطاقة "-d / -ed / -ied" للكتابة).') },
  };
  window.GRAMMAR = { cards, tenses, irregular: IRR, regular: REG, order: ['tenses', 'a_an', 'spell_s', 'spell_ing', 'spell_ed', 'regular', 'irregular', 'compare', 'gerund'] };
})();
