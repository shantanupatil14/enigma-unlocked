# Facts used in the Enigma Unlocked reel

Every factual sentence in the narration, the source it rests on, and how it is worded. Skim this before you post.
(Checked on 2026-10-08. Sources are public; read them yourself before relying on any single number.)

| In the video | What the sources say | Source |
|---|---|---|
| "World War Two. Armies sent their orders by radio, and anyone with a radio could listen in." | Radio traffic can be intercepted by anyone with a receiver; this is why military messages were enciphered. General background. | Any history of WWII signals intelligence |
| "Germany scrambled its messages with a machine called Enigma." | German forces used Enigma machines for radio and other messages through WWII. | https://www.pbs.org/wgbh/nova/decoding/enigma.html |
| "Invented by a German engineer, Arthur Scherbius, who patented it in 1918." | Scherbius, a German electrical engineer, filed the patent for a rotor cipher machine on 23 February 1918. | https://en.wikipedia.org/wiki/Arthur_Scherbius and https://www.dpma.de/english/our_office/publications/milestones/computerpioneers/enigma/index.html |
| "The German military adopted it in the late nineteen-twenties." | Navy adopted a military version in 1926, the Army in 1928 (the Air Force followed in 1935). | https://www.cryptocellar.org/enigma/e-prod-history/enigma-reichswehr-wehrmacht-orders.pdf and https://bombe.org.uk/the-enigma-machine/ |
| Card "Used throughout World War Two" | Enigma was in German service from before the war until 1945. | Same as above |
| "Polish mathematicians cracked early versions." | Marian Rejewski, Jerzy Rozycki and Henryk Zygalski of the Polish Cipher Bureau broke early military Enigma from December 1932. | https://ethw.org/Milestones:First_Breaking_of_Enigma_Code_by_the_Team_of_Polish_Cipher_Bureau,_1932-1939 and https://en.wikipedia.org/wiki/Marian_Rejewski |
| Card "1939 methods shared with Britain" (story cut timeline wording) | On 25 July 1939 the Poles shared their methods and a reconstructed Enigma with British and French intelligence. | https://ethw.org/Milestones:First_Breaking_of_Enigma_Code_by_the_Team_of_Polish_Cipher_Bureau,_1932-1939 |
| "At Bletchley Park in Britain, Alan Turing and his colleagues built machines to beat it." | Turing and Gordon Welchman, building on the Polish work, designed the Bombe, the machine used to find Enigma settings. | https://bombe.org.uk/ and https://en.wikipedia.org/wiki/Bombe |
| "Many historians believe that shortened the war by at least two years." | Enigma/Ultra intelligence is widely credited with shortening the war by at least two years (estimates vary; some say more). Worded as "many historians", never as a certainty. | https://en.wikipedia.org/wiki/Ultra_(cryptography) (see the section on its effect on the war) |
| "A twenty-fourteen film, The Imitation Game, dramatised that story." | 2014 film directed by Morten Tyldum about Alan Turing and the Enigma codebreaking effort. It is a dramatisation: it invents characters and events, rearranges chronology and gives little credit to the Polish codebreakers. | https://en.wikipedia.org/wiki/The_Imitation_Game and critiques such as https://www.sciencenews.org/article/-imitation-game-entertains-expense-accuracy |
| Machine walkthrough (E becomes I, the right wheel ticks, the other two stay still, plugboard, three wheels, mirror, back, lamp) | Generated live by this project's own Enigma code with rotors I, II, III, mirror B, all dials on A, cables AM FI NV. The scrambled message is the machine's real output: ENIGMAISAWESOME becomes IUUMOCDIOJVMPTS, and feeding that back with the same settings returns the original. | `tests.html` (26 tests) and `build_reel.py timing` |

## What the video deliberately does NOT claim
- It does not say the Germans invented Enigma "during the war": it was invented after the First World War (patent 1918), adopted by the military in the late 1920s and used through the Second World War.
- It does not say Turing alone broke Enigma: the Poles are credited first, and "his colleagues" are named in the line.
- It does not show or imitate anything from the film (no poster, stills, logo, music or lettering), only the film's title and year in plain text.
- Anna and Tom are fictional. Real people appear only as names in factual lines, never as drawn portraits.