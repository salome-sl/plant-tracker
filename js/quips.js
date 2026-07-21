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
    "Occam's razor called — it says your reasoning is needlessly complicated.",
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
    'Imperial? Gedurfd. De rest van de wereld wacht wel even.',
    'Ah, imperial. Want wie wil er nou getallen die door tien deelbaar zijn?',
    'Oké, maar niet komen klagen als je straks door 12 zit te delen.',
    'Imperial: een prima idee, in 1824 dan.',
    'Straks vertel je me nog dat de aarde plat is.',
    'Fahrenheit dus — nu bevriest water op 32, helemaal nergens om.',
    'Jij je zin. Ergens zucht een wetenschapper zachtjes.',
    'Negen van de tien wetenschappers kiezen metrisch. Raad eens welke jij bent.',
    'Onderzoek toont aan dat metrisch makkelijker is. Jij besluit dapper dat onderzoek te negeren.',
    'De data doet vermoeden dat je een paar natuurkundelessen hebt overgeslagen.',
    'Gedurfd. De Flat Earth Society stuurt je zojuist een lidmaatschapskaart.',
    'De evolutie gaf je tien vingers. De wetenschap ging ervan uit dat je de hint zou snappen.',
    'De peer review is unaniem. Het was één lange zucht.',
    'Imperial dus. NASA verspeelde hier ooit een ruimtesonde mee, zeg ik maar even.',
    'Ockhams scheermes belde — het vindt je redenering onnodig ingewikkeld.',
    'Weet je het zeker? Je kunt nog terug.',
    'Voorzichtig — zo begint het bij mensen die denken dat de aarde plat is.',
    'Imperial: bijeengehouden door traditie en pure hoop.',
    'Respect voor het zelfvertrouwen. Vraagtekens bij de eenheden.',
    'Rechtstreeks naar de duistere kant, zonder aarzelen. Respect, denk ik.',
    'De hypothese was dat je metrisch zou kiezen. Hypothese: resoluut verworpen.',
    'Ergens stelt een natuurkundige zijn vertrouwen in de mensheid stilletjes bij.',
    'Prima hoor. Vraag alleen niet hoeveel ons er in een gallon gaan.',
    'Zelfs een labrat kiest het simpelere doolhof. Gewoon een observatie.',
    'Ik neem aan dat even de komma verschuiven te veel gevraagd was.',
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
    'Welkom in de moderne wereld.',
    'Fijn dat je eindelijk het licht hebt gezien.',
    'Metrisch: je hebt zojuist een wetenschapper heel blij gemaakt.',
    'Ahh, tientallig. Voelt meteen beter, toch?',
    'Welkom terug bij je verstand. We hielden een stoel voor je vrij.',
    'De rede wint. De wetenschappelijke wereld is stiekem trots op je.',
    'De rest van de wereld zegt: werd tijd.',
    'Je hoort nu bij 95% van de planeet. Gezellig, hè?',
    'De hele wetenschappelijke gemeenschap slaakt zojuist een zucht van verlichting.',
    'Water bevriest op 0 en kookt op 100. Zoals het hoort.',
    'Wijs besluit. Elke wetenschapper sinds Newton geeft je een high five.',
    'Welkom aan de lichte kant. Wij hebben ook koekjes — én eenheden die door tien deelbaar zijn.',
    'Elke natuurkundige in de buurt gaf je zojuist een goedkeurende blik.',
    'Een tien. Wat toevallig precies is hoe metrisch werkt.',
    'Eindelijk. Je hoofd kan stoppen met omrekenen en gewoon ontspannen.',
    'Je bent overgestapt op het systeem dat wél klopt.',
    'Celsius: nu betekenen temperaturen weer iets.',
    'Slimme zet. De hele wereld knikt goedkeurend.',
    'Welkom thuis. Het metrieke stelsel heeft je gemist.',
    'De labjassen juichen — stilletjes en professioneel, maar ze juichen.',
    'Welkom terug. De wetenschappelijke gemeenschap hield je stoel warm.',
    'Je zag het licht — en het licht werd gemeten in lumen.',
    'De wetenschap verwelkomt je met open armen.',
    'Eén kleine tik voor jou, een grote sprong richting logica.',
    'Ergens is een hele onderzoeksafdeling oprecht trots op je.',
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
