// quips.js — Playful toast lines for switching unit systems.
//
// Metric is (obviously, objectively) the superior system, so switching TO
// imperial earns a gentle ribbing — imperial being "the dark side", with a few
// flat-earther nods — and switching back to metric earns a warm, science-y
// welcome. Kept good-natured — they tease the *choice* and the imperial system
// itself, never the person. Written natively in English and Dutch.

import { getLang } from './i18n.js';

// Shown when the user switches TO imperial — light teasing.
const TO_IMPERIAL = {
  en: [
    'Imperial? Bold choice. The rest of the world will wait.',
    'Welcome to the dark side. We measure things in body parts here.',
    'Ah, imperial. Because who needs numbers that divide by ten?',
    "Okay, but don't come crying when you're dividing by 12.",
    'Imperial units: a great idea, back in 1824.',
    "Next you'll be telling me the earth is flat, too.",
    'Fahrenheit it is — now water freezes at 32 for no reason at all.',
    'You do you. Somewhere, a scientist just quietly sighed.',
    'Ah, the dark side. Somewhere a flat-earther just nodded in solidarity.',
    'Imperial: an ounce for weight, an ounce for liquid — and no, not the same ounce. Enjoy.',
    'The dark side has 5,280 feet in every mile. Good luck with that.',
    'Bold. The Flat Earth Society just mailed you a membership card.',
    'A furlong, a peck, a stone — imperial has units for things that barely exist.',
    'Twelve inches to a foot, three feet to a yard. Math-class flashbacks, incoming.',
    'Imperial it is. NASA once lost a spacecraft over these units, just saying.',
    'Welcome to inches, where nothing quite lines up.',
    "You sure about this? There's still time to turn back.",
    'Careful — this is exactly how people end up thinking the earth is flat.',
    'Imperial: held together by tradition and sheer hope.',
    'Respect the confidence. Questioning the units.',
    'Straight to the dark side, no hesitation. Respect, I suppose.',
    "You've chosen chaos, and the flat-earthers are delighted to have you.",
    "Welcome to the dark side — mind the edge, it's a long way down.",
    "Cool, cool. Just don't ask how many ounces are in a gallon.",
    'The dark side welcomes you. Your microwave clock does not.',
  ],
  nl: [
    'Imperial? Gedurfd. De rest van de wereld wacht wel even.',
    'Welkom aan de duistere kant. Hier meten we in lichaamsdelen.',
    'Ah, imperial. Want wie wil er nou getallen die door tien deelbaar zijn?',
    'Oké, maar niet komen klagen als je straks door 12 zit te delen.',
    'Imperial: een prima idee, in 1824 dan.',
    'Straks vertel je me nog dat de aarde plat is.',
    'Fahrenheit dus — nu bevriest water op 32, helemaal nergens om.',
    'Jij je zin. Ergens zucht een wetenschapper zachtjes.',
    'Ah, de duistere kant. Ergens knikt een flat-earther instemmend.',
    'Imperial: een ounce voor gewicht, een ounce voor vloeistof — en nee, niet dezelfde ounce. Veel plezier.',
    'De duistere kant heeft 5.280 voet in elke mijl. Succes daarmee.',
    'Gedurfd. De Flat Earth Society stuurt je zojuist een lidmaatschapskaart.',
    'Een furlong, een peck, een stone — imperial heeft eenheden voor dingen die amper bestaan.',
    'Twaalf inch in een voet, drie voet in een yard. Rekenles-flashbacks, daar komen ze.',
    'Imperial dus. NASA verspeelde hier ooit een ruimtesonde mee, zeg ik maar even.',
    'Welkom bij inches, waar niets echt op elkaar aansluit.',
    'Weet je het zeker? Je kunt nog terug.',
    'Voorzichtig — zo begint het bij mensen die denken dat de aarde plat is.',
    'Imperial: bijeengehouden door traditie en pure hoop.',
    'Respect voor het zelfvertrouwen. Vraagtekens bij de eenheden.',
    'Rechtstreeks naar de duistere kant, zonder aarzelen. Respect, denk ik.',
    'Je hebt voor chaos gekozen, en de flat-earthers zijn er dolblij mee.',
    'Welkom aan de duistere kant — pas op voor de rand, het is een flinke val.',
    'Prima hoor. Vraag alleen niet hoeveel ons er in een gallon gaan.',
    'De duistere kant verwelkomt je. Je magnetronklok niet.',
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
    'Reason prevails. The scientific method is quietly proud of you.',
    'The rest of the world says: about time.',
    "You've joined 95% of the planet. Cozy, isn't it?",
    "Grams, meters, Celsius — the whole gang's back together.",
    'Water freezes at 0 and boils at 100. As nature intended.',
    'A wise decision. Every scientist since Newton just high-fived.',
    'Welcome to the light side. We\'ve got cookies too — and units that divide by ten.',
    'Metric activated. Somewhere, France is proud.',
    'Ten out of ten. Which, conveniently, is exactly how metric works.',
    'Finally. Your brain can stop converting and just relax.',
    "You've upgraded to the system that actually makes sense.",
    'Celsius: now temperatures mean something again.',
    'Smart move. The whole world just nodded approvingly.',
    'Welcome home. The metric system missed you.',
    'Ten fingers, base ten. It was always meant to be.',
    'Ahh, meters. No fractions, no drama, no 5,280 of anything.',
    'You saw the light — and the light was measured in lumens.',
    'The scientific community welcomes you with open arms.',
    'One small toggle for you, one giant leap toward sense.',
    'Metric it is. The dark side never stood a chance.',
  ],
  nl: [
    'Welkom in de moderne wereld.',
    'Fijn dat je eindelijk het licht hebt gezien.',
    'Metrisch: je hebt zojuist een wetenschapper heel blij gemaakt.',
    'Ahh, tientallig. Voelt meteen beter, toch?',
    'Welkom terug bij je verstand. We hielden een stoel voor je vrij.',
    'De rede wint. De wetenschap is stiekem trots op je.',
    'De rest van de wereld zegt: werd tijd.',
    'Je hoort nu bij 95% van de planeet. Gezellig, hè?',
    'Grammen, meters, Celsius — de hele bende is weer compleet.',
    'Water bevriest op 0 en kookt op 100. Zoals het hoort.',
    'Wijs besluit. Elke wetenschapper sinds Newton geeft je een high five.',
    'Welkom aan de lichte kant. Wij hebben ook koekjes — én eenheden die door tien deelbaar zijn.',
    'Metrisch aan. Ergens is Frankrijk trots.',
    'Een tien. Wat toevallig precies is hoe metrisch werkt.',
    'Eindelijk. Je hoofd kan stoppen met omrekenen en gewoon ontspannen.',
    'Je bent overgestapt op het systeem dat wél klopt.',
    'Celsius: nu betekenen temperaturen weer iets.',
    'Slimme zet. De hele wereld knikt goedkeurend.',
    'Welkom thuis. Het metrieke stelsel heeft je gemist.',
    'Tien vingers, tientallig. Het moest zo zijn.',
    'Ahh, meters. Geen breuken, geen gedoe, geen 5.280 van wat dan ook.',
    'Je zag het licht — en het licht werd gemeten in lumen.',
    'De wetenschap verwelkomt je met open armen.',
    'Eén kleine tik voor jou, een grote sprong richting logica.',
    'Metrisch dus. De duistere kant maakte nooit een kans.',
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
