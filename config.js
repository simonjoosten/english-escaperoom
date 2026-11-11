// ======================================================================
//  Settings for the END of the game. Change these to what you want!
// ======================================================================
window.ESCAPE_CONFIG = {
  // The 4 digits the players earn in the clock room (one digit per clock). They appear at the top.
  clockDigits: [2, 1, 3, 5],

  // The code the players get OFFLINE (from you). They type it in the 4 boxes of the final lock.
  secretCode: '2468',

  // The sign that makes the right sum: '+', '-' or 'x'.   2135 + 2468 = 4603
  finalSign: '+',

  // A code that opens the final lock straight away, just for testing.
  // !! Set this to '' (empty) before the real game !!
  testCode: '1432',

  // true  = the "Test" button and the "Skip level" button work.
  // false = test mode is switched off (use this for the real game).
  enableTestMode: true,
};
