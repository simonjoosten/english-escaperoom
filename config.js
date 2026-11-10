// ======================================================================
//  Settings for the END of the game. Change these to what you want!
// ======================================================================
window.ESCAPE_CONFIG = {
  // The 4 digits the players earn in the clock room (one digit per clock). They appear at the top.
  clockDigits: [5, 1, 8, 2],

  // The SECRET CODE that you give the players. Put the real one here!
  secretCode: '0000',

  // How the final answer is made from the clock code and the secret code:
  //   'concat' = the clock code, then the secret code   (5182 + 0000  ->  51820000)
  //   'sum'    = the two numbers added together         (5182 + 0000  ->  5182)
  combine: 'concat',

  // Or type the final answer yourself (letters or numbers). If this is not empty, the two settings above are ignored.
  // Example: finalAnswer: 'GOLDEN KEY'
  finalAnswer: '',
};
