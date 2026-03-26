import { DomainCategory, DOMAIN_CATEGORIES } from './types';

export interface DomainTerminology {
  advanced: string[];
  basicQuestions: string[];
}

export interface TerminologyAnalysis {
  domain: DomainCategory;
  advancedTermCount: number;
  basicQuestionCount: number;
}

export const TERMINOLOGY: Record<DomainCategory, DomainTerminology> = {
  electrical: {
    advanced: [
      'romex', 'gfci', 'afci', 'breaker panel', 'amperage', 'amp breaker',
      'knob and tube', 'conduit', 'junction box', 'load center', 'subpanel',
      'wire gauge', 'awg', 'three-way switch', 'dimmer switch', 'grounding rod',
      'neutral bus', 'hot wire', 'fish tape', 'voltage tester', 'multimeter',
      'dedicated circuit', 'arc fault', 'wire nut', 'receptacle', 'double pole',
      'single pole', 'tandem breaker', 'bonding', 'service entrance',
    ],
    basicQuestions: [
      'what is a circuit', 'how to turn off the power', 'how do i turn off',
      'what is a breaker', 'how to change a light', 'how to replace an outlet',
      'what size wire', 'how to wire a switch', 'what is grounding',
    ],
  },
  plumbing: {
    advanced: [
      'pex', 'sharkbite', 'copper sweat', 'solder joint', 'flux',
      'p-trap', 'closet flange', 'wax ring', 'ball valve', 'gate valve',
      'pvc primer', 'abs pipe', 'teflon tape', 'thread sealant', 'dielectric union',
      'supply line', 'drain auger', 'cleanout', 'backflow preventer',
      'pressure regulator', 'expansion tank', 'manifold', 'crimp ring',
      'hose bib', 'sweating pipes', 'water hammer', 'check valve',
    ],
    basicQuestions: [
      'how to fix a leak', 'how to unclog', 'how to stop a drip',
      'what is a p-trap', 'how to turn off water', 'how to replace a faucet',
      'what causes low water pressure',
    ],
  },
  carpentry: {
    advanced: [
      'miter saw', 'miter joint', 'dado joint', 'mortise and tenon',
      'biscuit joiner', 'pocket hole', 'kreg jig', 'router table',
      'table saw', 'circular saw', 'jigsaw', 'brad nailer', 'finish nailer',
      'framing nailer', 'wood glue', 'wood filler', 'shim', 'plumb',
      'level', 'square', 'stud finder', 'crown molding', 'baseboard',
      'casing', 'hardwood flooring', 'subfloor', 'joists', 'headers',
      'load bearing', 'toe nail', 'sister joist',
    ],
    basicQuestions: [
      'how to hang a shelf', 'how to cut wood', 'what type of nail',
      'how to measure', 'how to sand', 'how to find a stud',
      'what is a load bearing wall',
    ],
  },
  hvac: {
    advanced: [
      'btus', 'seer rating', 'tonnage', 'refrigerant', 'r-410a',
      'condenser', 'evaporator coil', 'blower motor', 'capacitor',
      'contactor', 'thermostat wire', 'ductwork', 'plenum', 'damper',
      'return air', 'supply vent', 'mini split', 'heat pump',
      'furnace filter', 'merv rating', 'zone control', 'line set',
      'flare fitting', 'vacuum pump', 'manifold gauge',
    ],
    basicQuestions: [
      'how to change a filter', 'what temperature to set',
      'how to clean vents', 'what is a heat pump', 'why is my ac not cooling',
      'how to program a thermostat',
    ],
  },
  general: {
    advanced: [
      'building code', 'permit', 'load calculation', 'blueprint',
      'spec sheet', 'material takeoff', 'punch list', 'general contractor',
      'subcontractor', 'change order', 'scope of work', 'lien waiver',
      'rough-in', 'trim-out', 'inspection', 'occupancy permit',
    ],
    basicQuestions: [
      'do i need a permit', 'how to hire a contractor',
      'how much does it cost', 'how long does it take',
      'can i do this myself', 'where to start',
    ],
  },
  landscaping: {
    advanced: [
      'grading', 'french drain', 'retaining wall', 'compaction',
      'geotextile fabric', 'paver base', 'polymeric sand', 'edging',
      'irrigation system', 'drip line', 'sod cutter', 'aerator',
      'top dressing', 'hardscape', 'softscape', 'drainage swale',
      'rain garden', 'mulch bed', 'root barrier',
    ],
    basicQuestions: [
      'how to plant', 'how to mow', 'when to water',
      'how to lay sod', 'what type of grass', 'how to edge a lawn',
    ],
  },
  painting: {
    advanced: [
      'primer', 'latex paint', 'oil-based', 'alkyd', 'shellac primer',
      'tsp cleaner', 'degloss', 'tack cloth', 'cutting in', 'edging',
      'roller nap', 'sprayer tip', 'hvlp sprayer', 'airless sprayer',
      'wet edge', 'lap marks', 'mil thickness', 'sheen', 'eggshell',
      'semi-gloss', 'satin finish', 'paint conditioner', 'extender',
    ],
    basicQuestions: [
      'how to paint a wall', 'what color to choose', 'how to tape',
      'how many coats', 'how to remove paint', 'what type of paint',
    ],
  },
  roofing: {
    advanced: [
      'asphalt shingles', 'architectural shingles', 'three-tab shingles',
      'ice and water shield', 'underlayment', 'flashing', 'drip edge',
      'ridge vent', 'soffit vent', 'valley', 'starter strip', 'hip cap',
      'roof deck', 'roof pitch', 'square of shingles', 'roofing nail',
      'step flashing', 'counter flashing', 'boot flashing', 'fascia',
      'gutter guard', 'eave',
    ],
    basicQuestions: [
      'how to find a leak', 'how long does a roof last',
      'when to replace a roof', 'how to clean gutters',
      'what is flashing', 'how to patch a roof',
    ],
  },
};

/**
 * Analyzes text for trade-specific terminology usage across all domains.
 * Counts advanced terms and basic question patterns to help gauge user expertise.
 */
export function analyzeTerminology(text: string): TerminologyAnalysis[] {
  const lowerText = text.toLowerCase();

  return DOMAIN_CATEGORIES.map((domain) => {
    const terms = TERMINOLOGY[domain];

    const advancedTermCount = terms.advanced.reduce((count, term) => {
      const termLower = term.toLowerCase();
      return count + (lowerText.includes(termLower) ? 1 : 0);
    }, 0);

    const basicQuestionCount = terms.basicQuestions.reduce((count, pattern) => {
      const patternLower = pattern.toLowerCase();
      return count + (lowerText.includes(patternLower) ? 1 : 0);
    }, 0);

    return { domain, advancedTermCount, basicQuestionCount };
  });
}
