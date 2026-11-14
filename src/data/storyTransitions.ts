export interface StoryChoice {
  label: string;
  effectText: string;
}

export interface StoryTransition {
  id: 'intro' | `level_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;
  speaker: string;
  uiTrigger: string;
  transmissionText: string;
  choices: [StoryChoice, StoryChoice];
}

export const storyTransitions: StoryTransition[] = [
  {
    id: 'intro',
    speaker: 'Director Vance — Mission Operations',
    uiTrigger: 'Stamp Authorization',
    transmissionText:
      'Welcome to the Mission Design Lab, Commander—starting today, every kilogram of metal and watt of power on our launchpad is your call. Out here, bad math explodes on the pad, while smart engineering opens the solar system.',
    choices: [
      {
        label: 'Check the flight rules. Launchpad is open!',
        effectText: 'Lab Bonus: Unlocked +10,000 Starting Grant Credits & Command HUD cleared.',
      },
      {
        label: 'Run a full systems check before building.',
        effectText: 'Engineer Tip: Always balance payload weight against rocket thrust before hitting launch.',
      },
    ],
  },
  {
    id: 'level_1',
    speaker: 'Chief Engineer Maya — Propulsion & Structures',
    uiTrigger: 'Check Payload Scale',
    transmissionText:
      'Gravity is charging rent on every extra bolt today—if our satellite is too heavy, our booster runs dry before reaching Earth orbit. Keep the build lean and trim every gram you do not need.',
    choices: [
      {
        label: 'Strip out heavy shielding for max speed.',
        effectText: 'Weight Hint: Lighter payloads climb higher using less fuel—watch the budget!',
      },
      {
        label: 'Double-check structural joints first.',
        effectText: 'Lab Check: All 9 satellite parts & 10 rocket stages must lock cleanly into place.',
      },
    ],
  },
  {
    id: 'level_2',
    speaker: 'Chief Engineer Maya — Power Systems',
    uiTrigger: 'Inspect Battery Warning',
    transmissionText:
      'Half of every Earth orbit happens inside Earth’s freezing shadow, where solar wings produce zero watts. Pack enough battery cells to keep the flight computer alive until sunrise.',
    choices: [
      {
        label: 'Prioritize reserve battery banks.',
        effectText: 'Power Hint: Store eclipse buffer power before adding extra science cameras.',
      },
      {
        label: 'Switch sensors to low-power sleep mode.',
        effectText: 'Efficiency Bonus: Reduced idle drain warning—stay under mission budget!',
      },
    ],
  },
  {
    id: 'level_3',
    speaker: 'Director Vance — Environmental Testing',
    uiTrigger: 'Run Shake & Freeze Diagnostic',
    transmissionText:
      'Liftoff shakes hardware like a paint mixer at 12Gs, then deep space plunges temperatures down to minus 150°C. Reinforce your frame and bolt on thermal heaters or our sensors will crack in orbit.',
    choices: [
      {
        label: 'Add thermal blankets & structural ribs.',
        effectText: 'Durability Bonus: Spacecraft rated for max acoustic vibration & vacuum freeze.',
      },
      {
        label: 'Test at full payload load.',
        effectText: 'Warning Hint: Triple-sensor stacks (Temp + Barometer + Camera) add extra launch mass!',
      },
    ],
  },
  {
    id: 'level_4',
    speaker: 'Dr. Aris — Deep Space Comms',
    uiTrigger: 'Click Blinking Radar',
    transmissionText:
      'A brilliant satellite is useless if its radio whispers never make it back to Ground Station. Mount a high-gain radar dish and aim cleanly toward Earth so your data stream breaks through atmospheric static.',
    choices: [
      {
        label: 'Boost transmitter gain for clear downlink.',
        effectText: 'Comms Bonus: Telemetry lock range extended (+15% signal margin).',
      },
      {
        label: 'Compress photos before transmitting.',
        effectText: 'Bandwith Hint: Sending tight data packets saves critical battery power.',
      },
    ],
  },
  {
    id: 'level_5',
    speaker: 'Dr. Aris — Lunar Science Lead',
    uiTrigger: 'Plot Lunar Orbit Burn',
    transmissionText:
      'Ice is hiding inside permanently shadowed craters at the Moon’s south pole—enough water to brew future rocket fuel! Reaching lunar orbit takes serious propellant, so upgrade your motor stage before departing.',
    choices: [
      {
        label: 'Fuel up with a heavy-impulse engine.',
        effectText: 'Delta-V Hint: Crossing 125+ km requires high-impulse boosters and low dead weight.',
      },
      {
        label: 'Aim straight for the polar terminator.',
        effectText: 'Science Bonus: High-contrast crater rim scanning flagged on flight plan.',
      },
    ],
  },
  {
    id: 'level_6',
    speaker: 'Director Vance — Orbital Rescue',
    uiTrigger: 'Lock Docking Radar',
    transmissionText:
      'Our Moon explorer ran dry of fuel just short of its return burn and is drifting off course! Launch an automated Fuel Tanker Drone to match speeds in orbit and pump fresh propellant aboard.',
    choices: [
      {
        label: 'Engage precision thruster braking.',
        effectText: 'Rendezvous Hint: Smooth small burns save tanker fuel during close approach.',
      },
      {
        label: 'Pre-pressurize fuel transfer lines.',
        effectText: 'Rescue Bonus: Docking transfer speed boosted—zero propellant boil-off!',
      },
    ],
  },
  {
    id: 'level_7',
    speaker: 'Dr. Aris — Planetary Defense',
    uiTrigger: 'Dial Cryo-Cooler Knob',
    transmissionText:
      'Dark asteroids hide in deep space by barely reflecting sunlight, so we have to spot their faint body heat in infrared instead. Cool our camera sensors down near absolute zero so the spacecraft’s own warmth does not blind them.',
    choices: [
      {
        label: 'Crank cryocoolers to maximum chill.',
        effectText: 'Optics Bonus: Thermal noise suppressed—faint asteroid tracks locked!',
      },
      {
        label: 'Point heat radiators away from the lens.',
        effectText: 'Cooling Hint: Keep solar wings & hot electronics opposite your optical aperture.',
      },
    ],
  },
  {
    id: 'level_8',
    speaker: 'Chief Engineer Maya — Outer Systems',
    uiTrigger: 'Arm Nuclear RTG Core',
    transmissionText:
      'Out near Mars, sunlight weakens to less than half Earth strength—dust storms can choke solar panels for weeks! Swap in a steady Plutonium RTG nuclear battery so your probe never freezes in the dark.',
    choices: [
      {
        label: 'Install shielded RTG power core.',
        effectText: 'Endurance Bonus: Continuous 24/7 power guaranteed even through Martian dust!',
      },
      {
        label: 'Use leftover decay heat for electronics.',
        effectText: 'Thermal Hint: RTG waste heat reduces electric heater power demand.',
      },
    ],
  },
  {
    id: 'level_9',
    speaker: 'Director Vance — Constellation Control',
    uiTrigger: 'Sync 3-Pad Launch Timer',
    transmissionText:
      'One lone satellite cannot guide rovers across the whole planet Mars at once. Coordinate rapid launches across multiple launchpads to lock three relay satellites into a tight triangle around the Red Planet.',
    choices: [
      {
        label: 'Stagger launches into evenly spaced orbits.',
        effectText: 'Network Bonus: 100% Mars surface coverage achieved with 3 synced nodes!',
      },
      {
        label: 'Pre-stage rockets before launch windows open.',
        effectText: 'Timing Hint: Multi-launchpad readiness prevents missed planetary alignment.',
      },
    ],
  },
  {
    id: 'level_10',
    speaker: 'Director Vance — Emergency Command',
    uiTrigger: 'Choose Policy',
    transmissionText:
      'Warning—a massive solar coronal flare will slam Mars orbit before our rescue timer hits zero! Hard-shield your ship’s electronics, burn straight through the radiation belt, and bring our stranded crew home safely.',
    choices: [
      {
        label: 'Full emergency power to shields & thrusters!',
        effectText: 'Final Directive: Max protection armed—brace for high fuel burn to beat the storm!',
      },
      {
        label: 'Route trajectory behind Mars’ magnetic shadow.',
        effectText: 'Tactical Hint: Timing your burn inside the planet shadow cuts radiation spikes by half!',
      },
    ],
  },
];
