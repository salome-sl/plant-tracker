// quips.js — Playful toast lines for switching unit systems.
//
// Metric is (obviously, objectively) the superior system, so switching TO
// imperial earns a gentle ribbing — mostly science good-naturedly questioning
// the reasoning, with a few flat-earther / "dark side" nods — and switching back
// to metric earns a warm welcome from the scientific community. Kept good-natured
// — they tease the *choice*, not the person. Written natively in English and Dutch.

import { getLang } from './i18n.js';

// Shown when the user switches TO imperial — light teasing.
const TO_IMPERIAL = {
  en: [
    'Imperial? Bold choice. The rest of the world will wait.',
    'Ah, imperial. Because who needs numbers that divide by ten?',
    "Okay, but don't come crying when you're dividing by 12.",
    'Imperial units: a great idea, back in 1824.',
    "Next you'll be telling me the earth is flat, too.",
    'Fahrenheit it is — now water freezes at 32 for no reason at all.',
    'You do you. Somewhere, a scientist just quietly sighed.',
    'Nine out of ten scientists recommend metric. Guess which one you are.',
    "Studies show metric is easier. You've bravely decided to ignore the studies.",
    'The data suggests you may have skipped a few science classes.',
    'Bold. The Flat Earth Society just mailed you a membership card.',
    "Evolution handed you ten fingers. Science assumed you'd take the hint.",
    'Peer review came back unanimous. It was just one long sigh.',
    'Imperial it is. NASA once lost a spacecraft over these units, just saying.',
    'Science spent centuries making measurement simple. You undid it in one tap.',
    "You sure about this? There's still time to turn back.",
    'Careful — this is exactly how people end up thinking the earth is flat.',
    'Imperial: held together by tradition and sheer hope.',
    'Respect the confidence. Questioning the units.',
    'Straight to the dark side, no hesitation. Respect, I suppose.',
    "The hypothesis was that you'd choose metric. Hypothesis: firmly rejected.",
    'Somewhere, a physicist is quietly revising their faith in humanity.',
    "Cool, cool. Just don't ask how many ounces are in a gallon.",
    'Even a lab rat picks the simpler maze. Just an observation.',
    'I guess just moving the decimal point over was too much to ask.',
  ],
  nl: [
    'Weinig landen gebruiken dit systeem nog. Jij weet vast iets wat de rest niet weet.',
    "Interessante keuze — en dan 'interessant' in de wetenschappelijke zin van het woord.",
    'De vakgroep natuurkunde heeft je keuze bekeken. Toen viel er een lange stilte.',
    'Onthoud even: twaalf van dit, drie van dat, zestien van het andere. Heel veel plezier.',
    'Gefeliciteerd — de Flat Earth Society heeft je zojuist een lidmaatschap aangeboden.',
    'Rechtstreeks naar de duistere kant, geen moment getwijfeld. Stoer, hoor.',
    '5280 voet in een mijl. Ooit vond iemand dat logisch. Jij blijkbaar ook.',
    'De rest van de wereld keek heel even op, en telde toen rustig verder tot tien.',
    'Vanaf nu bevriest water op 32 graden. Waarom? Dat weet echt niemand.',
    'Nog even en je meet afstand in armlengtes en tijd in koppen koffie.',
    'Fahrenheit erbij — want temperatuur mocht van jou best wat mysterieuzer.',
    'Ergens legt een natuurkundige heel zachtjes zijn hoofd op het bureau.',
    'Even de komma verschuiven was zeker te veel moeite?',
    'Dapper hoor. De rest van de wereld koos metrisch.',
    'NASA verspeelde hier ooit een ruimtesonde mee. Maar jij komt er vast uit.',
    'De wetenschap gaf je het voordeel van de twijfel. Heel even maar.',
    'Het lef heb je. De onderbouwing wat minder.',
    'Weet je het zeker? De terugknop is echt niet ver.',
    'Zelfs je rekenmachine kijkt nu even bedenkelijk.',
    'De data suggereert dat je natuurkunde hebt ingeruild voor een tussenuur.',
    'Knap hoor: mét een hele meetlat in de hand tóch de plank misslaan.',
    'Stiekem hoopte de wetenschap dat je het even zou opzoeken. Dat deed je niet.',
    'Je hebt tien vingers. De natuur gaf een duidelijke hint. Jij koos anders.',
    'Voortaan is elke omrekening een klein avontuur op zich. Geniet ervan.',
    'De peer review is binnen en unaniem: één diepe, lange zucht.',
  ],
};

// Shown when the user switches (back) TO metric — a warm welcome.
const TO_METRIC = {
  en: [
    'Welcome to the modern world.',
    'I\'m glad you finally saw the light.',
    'Metric mode: you\'ve just made a scientist very happy.',
    'Ahh, base ten. Doesn\'t that feel better already?',
    'Welcome back to sanity. We saved you a seat.',
    'Reason prevails. The scientific world is quietly proud of you.',
    'The rest of the world says: about time.',
    "You've joined 95% of the planet. Cozy, isn't it?",
    'The whole scientific community just exhaled in relief.',
    'Water freezes at 0 and boils at 100. As nature intended.',
    'A wise decision. Every scientist since Newton just high-fived.',
    'Welcome to the light side. We\'ve got cookies too — and units that divide by ten.',
    'Every physicist in earshot just gave you an approving glance.',
    'Ten out of ten. Which, conveniently, is exactly how metric works.',
    'Finally. Your brain can stop converting and just relax.',
    "You've upgraded to the system that actually makes sense.",
    'Celsius: now temperatures mean something again.',
    'Smart move. The whole world just nodded approvingly.',
    'Welcome home. The metric system missed you.',
    'The lab coats are cheering — quietly, professionally, but cheering.',
    'Welcome back. The scientific community kept your seat warm.',
    'You saw the light — and the light was measured in lumens.',
    'The scientific community welcomes you with open arms.',
    'One small toggle for you, one giant leap toward sense.',
    'Somewhere, an entire research department is genuinely proud of you.',
  ],
  nl: [
    'Welkom thuis. De meetlat lag al voor je klaar.',
    'Je hebt het licht gezien — en dat meten we toevallig netjes in lumen.',
    'De rede heeft gewonnen. Ergens knikt een natuurkundige goedkeurend.',
    'Alles maal tien. Voel je het al rustiger worden?',
    'Water bevriest op 0, kookt op 100. Geen kleine lettertjes.',
    'Welkom aan de lichte kant. Koekjes staan klaar, de eenheden kloppen.',
    'De rekenmachine mag met pensioen — voortaan verschuif je gewoon de komma.',
    'Knoop doorgehakt, en een verstandige ook. De hele wereld knikt mee.',
    'Welkom bij de 95% van de planeet die het gewoon snapt.',
    'Voortaan is optellen weer gewoon optellen. Wat een rust.',
    'Geen breuken meer, geen giswerk — gewoon ronde, eerlijke getallen.',
    "Je hoeft nooit meer op te zoeken hoeveel dat 'in het echt' is.",
    'Slimme keuze. De rest van je dag wordt er meetbaar aangenamer op.',
    'Welkom terug bij je verstand — we hadden je stoel warm gehouden.',
    'Goed bezig. Vanaf nu klopt alles netjes tot op de gram.',
    'Celsius weer aan boord: nu betekenen graden eindelijk weer iets.',
    'Goede keuze. De wetenschap ontvangt je met open armen.',
    'Eén tikje voor jou, een reuzenstap richting logica.',
    'De rest van de wereld mompelt tevreden: werd tijd.',
    'Je stapte over op het systeem dat gewoon klopt. Petje af.',
    'Welkom terug in de wereld waar de getallen gewoon kloppen.',
    'Bij zinnen gekomen. Dat verdient een schouderklopje.',
    'Eén overwinning voor de logica — en eentje voor jou.',
    'Moge de meetlat met je zijn. Vanaf nu klopt-ie tenminste.',
    'Verstandig. En verstandig staat je eigenlijk best goed.',
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// target = the unit system the user just switched TO ('imperial' | 'metric').
export function unitSwitchMessage(target) {
  const lang = getLang() === 'nl' ? 'nl' : 'en';
  const set = target === 'imperial' ? TO_IMPERIAL : TO_METRIC;
  return pickRandom(set[lang]);
}
