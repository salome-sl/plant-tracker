// quips.js — Playful toast lines for switching unit systems.
//
// Metric is (obviously, objectively) the superior system, so switching TO
// imperial earns a gentle ribbing and switching back to metric earns a warm
// welcome. Kept good-natured — they tease the *choice* and the imperial system
// itself, never the person. Written natively in English and Dutch.

import { getLang } from './i18n.js';

// Shown when the user switches TO imperial — light teasing.
const TO_IMPERIAL = {
  en: [
    'Imperial? Bold choice. The rest of the world will wait.',
    'Switching to feet and inches — living dangerously, I see.',
    'Ah, imperial. Because who needs numbers that divide by ten?',
    "Okay, but don't come crying when you're dividing by 12.",
    'Imperial units: a great idea, back in 1824.',
    'A brave soul wanders into the land of fractions.',
    'Fahrenheit it is — now water freezes at 32 for no reason at all.',
    'You do you. Somewhere, a scientist just quietly sighed.',
    "Sure, let's measure in king's feet. Very cutting-edge.",
    'Imperial mode on. May no recipe ever ask you for 3/8 of a cup.',
    'Imperial — the scenic route to every calculation.',
    'Bold. A little baffling. But bold.',
    'Enjoy your pounds and ounces, you rebel.',
    "Ah yes, the system where a pint isn't even a pint everywhere.",
    'Imperial it is. NASA once lost a spacecraft over these units, just saying.',
    'Welcome to inches, where nothing quite lines up.',
    "You sure about this? There's still time to turn back.",
    'Feet, miles, and vibes. Noted.',
    'Imperial: held together by tradition and sheer hope.',
    'Respect the confidence. Questioning the units.',
    'Off you go, into the land of twelfths.',
    'Imperial — because measuring should feel like a riddle.',
    'Somewhere, France just felt a small disturbance.',
    'Cool, cool. Just don\'t ask how many ounces are in a gallon.',
    'You picked the units your microwave clock secretly resents.',
  ],
  nl: [
    'Imperial? Gedurfd. De rest van de wereld wacht wel even.',
    'Voortaan in voet en inch — lekker gevaarlijk leven, zie ik.',
    'Ah, imperial. Want wie wil er nou getallen die door tien deelbaar zijn?',
    'Oké, maar niet komen klagen als je straks door 12 zit te delen.',
    'Imperial: een prima idee, in 1824 dan.',
    'Een dappere ziel dwaalt het land van de breuken in.',
    'Fahrenheit dus — nu bevriest water op 32, helemaal nergens om.',
    'Jij je zin. Ergens zucht een wetenschapper zachtjes.',
    'Prima, laten we meten in koningsvoeten. Heel vooruitstrevend.',
    'Imperial aan. Moge geen recept ooit om 3/8 kop vragen.',
    'Imperial — de toeristische route naar elke berekening.',
    'Gedurfd. Ietwat verwarrend. Maar gedurfd.',
    'Veel plezier met je ponden en onsen, rebel.',
    'Ah ja, het systeem waar een pint niet eens overal een pint is.',
    'Imperial dus. NASA verspeelde hier ooit een ruimtesonde mee, zeg ik maar even.',
    'Welkom bij inches, waar niets echt op elkaar aansluit.',
    'Weet je het zeker? Je kunt nog terug.',
    'Voeten, mijlen en een goed gevoel. Genoteerd.',
    'Imperial: bijeengehouden door traditie en pure hoop.',
    'Respect voor het zelfvertrouwen. Vraagtekens bij de eenheden.',
    'Vooruit dan, het land van de twaalftallen in.',
    'Imperial — want meten mag best een raadsel zijn.',
    'Ergens voelde Frankrijk zojuist een lichte rilling.',
    'Prima hoor. Vraag alleen niet hoeveel ons er in een gallon gaan.',
    'Je koos de eenheden waar je magnetronklok stiekem een hekel aan heeft.',
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
    'Excellent choice. Everything divides by ten now.',
    'The rest of the world says: about time.',
    "You've joined 95% of the planet. Cozy, isn't it?",
    'Grams, meters, Celsius — harmony restored.',
    'Water freezes at 0 and boils at 100. As nature intended.',
    'A wise decision. Your calculator thanks you.',
    'Welcome to the light side. We have consistent units.',
    'Metric activated. Somewhere, France is proud.',
    "That's the good stuff. Enjoy the simplicity.",
    'Finally — no more dividing by 12.',
    "You've upgraded to the system that actually makes sense.",
    'Celsius: now temperatures mean something again.',
    'Smart move. The whole world just nodded approvingly.',
    'Welcome home. The metric system missed you.',
    'Ten fingers, base ten. It was always meant to be.',
    'Ahh, meters. Simple, elegant, correct.',
    'You saw the light — and the light was measured in lumens.',
    'The scientific community welcomes you with open arms.',
    'One small toggle for you, one giant leap toward sense.',
    'Metric it is. Everything just got easier.',
  ],
  nl: [
    'Welkom in de moderne wereld.',
    'Fijn dat je eindelijk het licht hebt gezien.',
    'Metrisch: je hebt zojuist een wetenschapper heel blij gemaakt.',
    'Ahh, tientallig. Voelt meteen beter, toch?',
    'Welkom terug bij je verstand. We hielden een stoel voor je vrij.',
    'Uitstekende keuze. Alles deelt nu netjes door tien.',
    'De rest van de wereld zegt: werd tijd.',
    'Je hoort nu bij 95% van de planeet. Gezellig, hè?',
    'Grammen, meters, Celsius — de rust is terug.',
    'Water bevriest op 0 en kookt op 100. Zoals het hoort.',
    'Wijs besluit. Je rekenmachine is je dankbaar.',
    'Welkom aan de lichte kant. Wij hebben consistente eenheden.',
    'Metrisch aan. Ergens is Frankrijk trots.',
    'Dat is het goede spul. Geniet van de eenvoud.',
    'Eindelijk — geen gedeel door 12 meer.',
    'Je bent overgestapt op het systeem dat wél klopt.',
    'Celsius: nu betekenen temperaturen weer iets.',
    'Slimme zet. De hele wereld knikt goedkeurend.',
    'Welkom thuis. Het metrieke stelsel heeft je gemist.',
    'Tien vingers, tientallig. Het moest zo zijn.',
    'Ahh, meters. Simpel, elegant, correct.',
    'Je zag het licht — en het licht werd gemeten in lumen.',
    'De wetenschap verwelkomt je met open armen.',
    'Eén kleine tik voor jou, een grote sprong richting logica.',
    'Metrisch dus. Alles werd zojuist een stuk makkelijker.',
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
