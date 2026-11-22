# Animatronic bands: how classic shows were built and programmed

Research for turning the music-reactive noodle-cart scene (cat, table, lamps, sign, puddles, steam) into an "animatronic band", where each object is a performer tied to song tracks.

How to read this: Parts 1 to 4 report what the sources say, with numbers, formats and quotes. Statements marked **Synthesis** are my own inferences. Part 5 is synthesis throughout, and Part 6 is the list of design lessons. Some sources were read through a summarising fetch tool, so a few short quotes are that tool's extracts and not verbatim transcriptions. These are marked (via summary). Quotes from Cheese-E-Pedia pages and transcripts were taken from the raw page text. Cheese-E-Pedia is a fan wiki. Its format pages are reverse-engineered by restorers and are the best technical record that exists, but they are not official documentation.

---

## 0. The short version

- Every classic show is a **multitrack tape**: show audio on some tracks, movement data on others, played in lockstep. The Tiki Room used 2 tracks per bird in the patent and 14 for the room. The Rock-afire used 4 tracks (2 audio, 2 data). Cyberamics used reel, then S-VHS, then DVD, then a network stream.
- Nearly all of the classic movement data is **binary**. Each bit is one pneumatic valve that is open or closed. Air pressure and flow controls set how fast each cylinder travels, and that speed was tuned per movement, not per cue. Proportional (servo) control came later: on eyes in the 1990s, and for every function in modern electric figures.
- Shows were programmed by **puppeteering in real time against the soundtrack, one or a few movements per pass, layered**. Programmers did the mouths first. A per-programmer **reaction-time offset** was subtracted afterwards. The data was then edited frame by frame.
- Between songs the figures ran a **random-movement program** from a separate source (an EPROM card), so they never froze.
- The craft wisdom is consistent across Disney, ShowBiz, Engineered Arts and hobbyists. Anticipate, offset and never mirror ("twin") the two sides, let secondary motion do the work, and tie blinks to phrases. Don't move constantly. Let one figure take focus. The number of movements matters less than how they are used.

---

## 1. ShowBiz Pizza Place's Rock-afire Explosion (Creative Engineering Inc., Aaron Fechter)

### 1.1 The band and its movements

Creative Engineering Inc. (CEI) in Orlando built the Rock-afire Explosion. It debuted in 1980 and grew out of CEI's earlier shows (Wolf Pack 5, Bear Country Jubilee). Fechter has said that the crates in his warehouse hold "the very last one of 280 shows that we built between 1980 and 1983" (*The Rock-afire Explosion* documentary, transcript on Cheese-E-Pedia). The characters are Billy Bob Brockali (bear, bass), Fatz Geronimo (gorilla, keyboards), Beach Bear (guitar), Dook LaRue (drums), Mitzi Mozzarella (vocals), Rolfe DeWolfe and his hand puppet Earl Schmerle, and Looney Bird (a head rising from an oil drum). There are also props: Sun, Moon, Antioch the spider, Choo-Choo and Birthday Bird (Wikipedia).

**Movement counts.** These come from the Layton Bit Stripper's character DIP-switch table, which gives bits per controller, and from the per-character Cheese-E-Pedia pages:

| Performer | Bits | Notes |
|---|---|---|
| Billy Bob | 20 | Mouth, L and R eyelid raise, eyes L/R, head L/R, head tilt L/R, head up, left hand slide, right arm raise, right arm twist, right elbow twist/strum, right wrist, guitar raise, body twist L/R, foot tap, body lean. All 20 are on the bottom drawer, bits 39–63. |
| Rolfe & Earl | 22 | Rolfe has 19: mouth, two ears, two lids, eyes L/R, head L/R/up, two full arms (raise, twist, elbow), body twist L/R, lean. Earl has 3: head tilt, mouth, eyebrow. |
| Mitzi | 19 | Mouth, two ears, two lids, eyes L/R, head L/R/up, arm raise ×2, elbow ×2, arm twist ×2, body twist L/R, body lean. |
| Dook LaRue | 17 | Mouth, two ears, two lids, eyes L/R, head L/R/up/down, body lean, arm swing ×2, elbow ×2, bass-drum foot. |
| Fatz | 16 | Mouth (bit 45), L/R lids, eyes L/R, head L/R, head tip L/R, head up, arm swing ×2, elbow ×2, foot tap, body lean. |
| Beach Bear | 16 | Two lids, eye cross, left-hand slide, guitar raise, head L/R/up, two leg kicks, right arm raise, right arm twist, right elbow twist, right wrist, body lean, mouth. |
| Looney Bird | 6 | |
| Organ & sign | 14 | Lights |
| Spots | 8 | One per character plus specials |
| Curtains | 6 | |
| Props | 8 | |
| Floods | 12 | |
| Stage lights | 19 | |
| Specials | 3 | |

Lights, curtains and spots ride the **same data stream** as the characters. The bit chart has one numbering for everything: "Each bit represents a character movement, light, or special effect, which can either be in an on or off state" (Cheese-E-Pedia, *Bit Chart*).

**Actuation.** The figures are pneumatic. From a technician's account in the documentary: "you have uh- what's called Mac Valves that's on the floor up under the characters … The Mac Valves suck the air and uh- and it blows it back into a muffler so it makes em come alive." During Concept Unification (1990–92), when the Rock-afire figures were re-skinned as Chuck E. Cheese characters, the "only mechanical change was the lowering of air pressure for his movements, and later diagnostic changes to the air flow in the cylinders" (Fatz page). On Looney Bird the pressure went from 80 psi to 70 psi, and the mouth cylinder clevis was changed from 1" to 2" (Looney Bird page). Speed and feel live in the pneumatics (pressure and flow restrictors), not in the data.

### 1.2 Show-tape format

**CEI 4-track reel** (Cheese-E-Pedia, *CEI 4-Track Reel*):
1. Track 1: show audio left (dbx encoded)
2. Track 2: show audio right (dbx encoded)
3. Track 3: Pianocorder-format biphase data, **top drawer**
4. Track 4: Pianocorder-format biphase data, **bottom drawer**

The tape is decoded by the "Grey Box" (the playback computer, built from parts of Superscope's Pianocorder player-piano system). It contains 6 Pianocorder driver boards and 2 playback boards, and each drawer decodes one data track independently. Wikipedia: "The Rock-afire Explosion uses four recorded tracks, two for audio and two for data." In later years the same layout lives in WAV files: a 4-track file (audio 1–2, data 3–4) or a 6-track file with the data on tracks 5–6.

**Data encoding** (Cheese-E-Pedia, *Pianocorder Data Format*):
- "Pianocorder data is a 4500 bps stream of Biphase Mark Code serial data."
- "It is often said that biphase data is somehow 'encoded as audio', but this is a misconception -- it's simply serial data running at a rate that happens to align with the range of frequencies commonly reproducible by standard audio equipment." With BMC, a 0 is a 2250 Hz half-cycle and a 1 is two 4500 Hz half-cycles. It is polarity-insensitive and has no DC component, which is why it survives audio gear.
- "Pianocorder frames are 128 bits in length and transmitted continuously at a nominal 35.15625 frames per second." (4500 / 128 = 35.156.) "The last byte of each 128-bit sequence is set to a fixed value, used to delimit each frame … Consequently, 120 bits per frame are available." The sync byte is 11111101.
- **Snapshot, not commands:** "The Pianocorder Data Format isn't command based as its actually Snapshot-Based … It then replaces the current state of the driver boards with the entire data frames output." Every frame (about 28.4 ms) carries the full on/off state of every valve and light on that drawer.

So the classic Rock-afire is roughly **2 × 120 = 240 binary channels refreshed about 35 times a second**, of which about 186 are used (sum of the table above). That works out to roughly 6 to 22 valves per character.

Its origin is the **Pianocorder** itself (pianocorder.info). It "supports 80 notes, along with the soft and sustain pedals", in "128-bit frames … streamed at a rate of approximately 35 frames per second", on cassette running at 3.75 ips. Dynamics come from "5-bit treble and bass intensity values". One shared loudness per half of the keyboard per frame is the only analog-ish quantity. Tempo is changed by changing tape speed. CEI repurposed a player-piano protocol: each piano key became a valve.

**New Rock-afire (early 1990s).** This is an Apple IIe with custom cards. Show data is decoded from the VCR video's vertical blanking interval and output again as Pianocorder data to "27 Bit Strippers". Each of these decodes 27 bits: "Twenty-one of these bits can control valves, with the remaining six being used for position selection for the servos … usually eyes left/right, eyes up/down, and eyelids wide/closed. Each servo has two bits dedicated to it, with each bit being dedicated to one of the two 'away' positions. With neither bit activated, the movement returns to its 'home' position." That is a **three-state servo (home / away-A / away-B) carried on two binary bits** (Cheese-E-Pedia, *New Rock-afire Explosion Control System*).

**Before the Pianocorder: tone decoders.** CEI's late-1970s shows (Bear Country Jubilee, Wolf Pack 5) used analog tone decoder modules. Each module detects one frequency, and frequencies are reused across tape tracks because analog filters can't separate many tones on one track (Cheese-E-Pedia, *Tone Decoder Control System*). This is the same idea as Disney's 1963 reed relays.

### 1.3 How Rock-afire shows were programmed

**CEI Apple II Programmer** (Cheese-E-Pedia):
- "designed and written around early 1982 by Aaron Fechter for the Apple II+ after his dissatisfaction with his engineers' attempts to replace the CEI Multitrack Programmer with a logic gate-based programmer". It was upgraded for the Apple IIe in 1983, and the final version, 7.02, dates from about 1993.
- **Two Apple IIe computers.** One decodes a proprietary timecode called **Block Numbers** from track 3 or 4 of a 4-track cassette or reel that holds the stereo show mix on tracks 1–2. The other runs the programmer. Two machines were needed because "speed limitations of computers of the early 1980's prevented one computer from being able to decode Block Numbers and handle all other programming functions simultaneously." Block numbers get software error correction "to prevent dropouts during programming."
- "Each song would be stored on its own floppy disk", with a master and a copy kept in separate boxes. "The programming tape and floppy always had to be kept together and were regarded as having equal value since it would be impossible to remake a programming tape because of the necessity of consistent, identical block number placement in sync with the show audio."

**The workflow is real-time puppeteering.** Fechter's *Animatronics Experimenter's Kit* (a modern hobby product with a tone-decoder head called Gary Gargoyle) demonstrates the original principle in the simplest form (transcript, Cheese-E-Pedia):

> "a stereo recorder has two tracks, a left and a right. And we're going to use one track for audio, and we're going to put tones on the other track … when I press this button, it'll send a tone right through this second track … which then opens Gary Gargoyle's mouth … by pressing the button, I open the mouth. By holding the button, I keep it open. And by letting the button go, the mouth closes."

He records the voice and the mouth button in one pass and plays it back. That is programming.

**Fan era.** The 2008 *Spin* profile says Chris Thrash bought a full band from Fechter, and a fan, Snapper Ard, "taught him how to program the robots". For the 2006 "Ms. New Booty" video they worked "in a 24-hour nonstop no-sleep binge" to enter each movement. Fechter (documentary): "I've been programming shows again. Partly because of Chris … now I've finally got someone who understands the joy of programming".

### 1.4 Modern replay and programming tools (fan and restorer community)

- **Layton Bit Stripper** (Layton Sanders, 2018; sold by CEI from 2019). It is an ATmega-class board that accepts standard Pianocorder biphase data, drives any Rock-afire character, and passes data through to the next controller. It has 30 LEDs for per-channel status and data sync, and a 5-bit DIP switch selects the character (table above). Firmware changelog details show how unforgiving the format is. V1.1B "Fixed a previously undetected bug which caused outputs to be updated 600 microseconds later than they should be". V1.1C "Increased the movement diagnostic cycle time to allow longer stroke movements to fully extend and retract". For the Four Little Shavers, "Curly's right elbow and right arm twist always actuate at the same time because of the potential of his mirror hitting and damaging his nose". That last one is a mechanical interlock implemented in software.
- **Blue Box** (David Ferguson). This is a replacement controller that also lets venues "program your own custom shows". The Kansas City venue used it to play newer songs (documentary).
- **Rock-afire Replay** (Unity, August 2020). It started as a single Billy Bob mech "with the ability to activate Billy Bob's movements with certain keys". The next update "added movement recording and file sharing" as `.rshw` files containing "author data, programmed movements, and audio". There were 57 fan shows by 1 October 2020. It introduced **live visual programming**: "Most fan show creators in the past would blindly program shows and send them over to animatronic owners to view their progress." It added a **merge** feature "as blind programmers were used to collaborating with others to each animate certain characters or lighting effects." CEI pressure got it pulled in January 2021. It forked into Faz-Anim, Reel to Real (Chuck E. Cheese; ended by a cease-and-desist in December 2022) and RetroMation (CEI-endorsed in 2024, and used by CEI for official advent-calendar shows). CEI's official *Rock-afire Simulator* is in development. Fechter asked that programming be built in, "as fans might not like it if there wasn't any ability to program shows."
- Restorers bake Ampex reels for "at least 4 hours" at 130–140 °F to recover data (Sticky-Shed Syndrome). They decode BMC from WAVs by detecting edges at about 7-sample spacing at 48 kHz and looking for the sync byte. Cheese-E-Pedia gives an ffmpeg-concat recipe for *encoding* BMC from 2250 Hz and 4500 Hz half-cycle snippets.

**Synthesis.** I found no source describing a standard fan workflow that drives Rock-afire bits from MIDI. Fans program with keyboard keys in simulators (Replay and descendants) and export biphase WAVs or controller files. Hobbyist MIDI-to-servo work (§3.4) is a separate tradition.

---

## 2. Chuck E. Cheese's Pizza Time Theatre: Cyberamics, SongCode, APS, Studio C

### 2.1 Cyberamics hardware and movements

The **Cyberamic Control Center** ran from December 1978 (Kooser Rd, San Jose) through 1983 production. Its media went from 7" reels on a modified TEAC X-7, to S-VHS in 1988–90 ("Cyberstar", with "scrambled showtape signals" decoded by an EPROM), to DVD in 2005–08, to the network-streamed **Navori** system in 2023 (Cheese-E-Pedia, *Cyberamic Control System*, *Cyberstar*, *Navori*).

Cards in the cage:
- **Transfer Control Card**: decodes analog tape signals into bits.
- **Character Drive Card**: one per character. "Seemingly each character had a custom labeled chip on their board … their red lights would blink in accordance to the showtape signals."
- **Light Driver Card**: "functioned exactly like a Character Drive Card". Lights are characters too.
- **Valve Bank Card** at each character's base.
- **Random Movements Card**: "provides random movements for characters between showtape segments. This card contains an EPROM of the raw random movement signals" (256 Kbit EPROMs, versions 1.0–1.6).
- **Audio Control Card**, with "an Audio Gain Control microphone … that would allow the show to increase in volume as the showroom became more crowded."
- A tape-start tone of about 21 Hz, heard during 144 ips rewind as an audible chirp, auto-stops the rewind.

**Movement counts.** Cyberamic Chuck E. Cheese, Mr. Munch and Helen Henny each had **8 movements**, for example Munch: "Mouth, Eyelids, Eye Turn Right, Eye Turn Left, Head Turn Right, Head Turn Left, Left Arm, Right Arm" (plus a door on the Portrait stage). "The restriction of 8 movements to a character lines up with the 8 movements given to any given character on a Cyberamic Control System Character Card" (Cheese-E-Pedia, *Big C's Cyberamics Center*). Some early Helens had **head-turn-right wired to left-arm-twist**: two movements on one bit, later split. Compare the Rock-afire's 16 to 22.

### 2.2 SongCode and the programming desk (1978–1990)

- **SongCode** ran on a PDP-11 (later a PDP-11/23) with 32 KB, an ADM-3a terminal and dual floppies. It was "a programming system that could transfer its command-based signals to audio reels, needing only a single audio channel to work." Unlike the Pianocorder snapshots, SongCode was **command-based**. Its encoding survives in Studio C files: commands as printable ASCII 0x30–0x3F and channel numbers as 0x40–0x5F (Cheese-E-Pedia, *SongCode*, *Studio C File Formats*).
- The **CEC Tester** was a small blue box with **2 joysticks (8 directions each), 8 switches and 8 buttons**, "all … various ways of controlling a single character, allowing movements to be stuck on, manually pushed on, or dynamically controlled with a joystick." In a Kooser news clip, Mike Hatcher says: *"What this actually is amounts to is electronic puppeteering, only instead of having strings, you have buttons, switches, and joysticks."* A later red desk controller extended this to 16 controls (a full character card) and added "five buttons shaped to fit the user's hand", which Cheese-E-Pedia guesses were for the five main mouths.
- From the 1984 merger until 1990, the same desk also programmed Rock-afire tapes through a Grey Box.

### 2.3 APS: the Animation Programming System (1990 to today)

David Philipsen wrote APS for ShowBiz Pizza Time in 1990. It remained CEC's programming system through Studio C (1997) and a 2017 day/night update (Cheese-E-Pedia, *Animation Programming System*, *APS Files*).

**File format (.aps, with stage-specific extensions .3st, .roa, .r12, .mvt for random movements, and others):**
- "Data is stored at **29.97 FPS** and each frame contains the state of all bits, so playback can be seeked to any arbitrary location without needing to process any preceding data."
- "Frames are made up of **32 bytes, storing 256 channels**." Bits are stored LSB first, and the second drawer starts at show bit 129.
- Frames are stored in 0x400-byte chunks of **30 frames** (2 slots left unused), one second per chunk, after a 0x200 plaintext header holding length and title lines.
- "APS files do not contain the required information to sync with audio." Sync came from the tape's SMPTE timecode.
- Show files were per segment (a 7–8 minute block of songs), never for intermissions. A Christmas '90 segment of 7:50 is 481,792 bytes.

**The programming interface.** SPTAP, the ShowBiz Pizza Time Animation Program:
- An **Assign** menu maps bits to the 8 buttons of a physical controller, saved as `.asg` files. "The maximum bits assignable inside the file was 8." Files seen on screen in a 1991 promo include `MOUTHS.ASG`, `CECHEAD.ASG`, `CECARMS.ASG`, `HELEYES.ASG`, `HELHEAD.ASG`, `MUNCHEYE.ASG`, `PASARMS.ASG`, `SNARES.ASG`, `SPOTLTS.ASG`, `CURTAINS.ASG`, `CAMERA.ASG`, `WINK.ASG`, `OHBOUNCE.ASG`. So a programmer loads "all the mouths" or "Helen's eyes" onto one 8-button hand, and then does a pass.
- "The controller consisted of a top row of 8 toggle buttons, and a bottom row of 8 input buttons. Each toggle would record inputs for the button below it when enabled." Toggles act as per-bit record-arm switches, so you can overdub some bits and leave the rest.
- Playback can be paused, fast-forwarded, rewound, and jumped between segments while the figures move live.
- **SMPTE Synchronization Program**: "used for offsetting the bits in a showtape to account for user error and reaction times … In the mid 90's this would be upgraded to support offsetting a specific bit in the show, which would mainly be used for mouth movements."

**Brian Hagan**, former CEC studio manager, interview transcript on Cheese-E-Pedia. This is the most useful first-hand account of the craft:

> "you kind of want to be the character … you have to think of what the character's physical limitations are … when you're playing a piano or keyboard and you're listening to music … now the song's going into a lower key going down here now we're going into an upper key so we're moving up … if you're hearing individual chords then you're doing ups and downs … together if you're hearing multiple … chords going on at one time then you've got a fast moving action back and forth … in a way it's acting"

> "it's one movement at a time or a couple of movements at a time … you're just layering on top of each other … the unsung rule of thumb was … we always started with the mouths … do all the vocals first … because that's kind of the trickiest part … to get that lip sync right in fact we built into the programming … what's called an offset because we know your human reaction to pressing a button is delayed … my personal delay is x amount of frames … you would set your offset before you began programming"

> "there's 30 operations per second so there was an actual character that divided the frame markers … the tape rewind command is dollar dollar z … you'd go in and edit the file it was nothing but a dos based text file"

Studio C was first programmed in the back of a store on a mock-up stage, "with the playback deck with the time code", with every effect on an individually labelled outlet.

**CEC-Stage Rosetta** (Philipsen, 1997) automatically translated 3-Stage programming (Rock-afire mechs, 16–22 bits each) to the 8-bit Cyberamics so the shows didn't have to be programmed twice. The mapping table shows how a rich performance collapses onto a poor one. Chuck's "Left Eyelid" (bit 2) becomes Cyberamic "Eyelids" (bit 6) **inverted**. Jasper's "Head Left" becomes "Head Left + Eyes Left": one source bit drives two targets. Many source bits (ears, arm twists, body lean) map to nothing. Spotlights map 1:1 (Cheese-E-Pedia, *CEC-Stage Rosetta*).

### 2.4 Studio C (1997–2022): a command language

Studio C (Garner Holt Productions figures: a 32-movement Chuck, cut in 2002 to a 16-movement "16m" that dropped head tilts, eyebrows, ears, foot tap, wrist turns and so on) used **Cyberstar 2000** with command files, not snapshots (Cheese-E-Pedia, *Studio C File Formats*):
- `.CEC` segment files: `A` set analog value, `M` call subroutine, `R` random-movement enable, `K` karaoke subroutine, `C` clear all channels, and digital on/off pairs in the SongCode ASCII encoding.
- `CYBRSTAR.CCF` subroutine library opcodes: 01 Digital On (up to 4 channels), 02 Digital Off, **03 Digital Pulse ("Pulses selected digital(s) for 1/2 second")**, 04 Set Analog, 05 Analog Pulse, **06 Analog Fade ("Fades selected analog to specific value at a specific rate")**, 12 **Arm Subroutine ("execute after a specific number of frames")**, 13 Trigger Subroutine, 19–28 variables and conditionals, **33 Random Enable**, 30 Next Show.

When Navori could not stream Studio C's file-based data in 2022, every Studio C figure was set to **"Random Movements Mode"**: show audio and video played, "but the animatronic would instead randomly move to a pre-set pattern." Fans recorded this as the end of Studio C as a performance. The figure still moved, but nothing it did related to the song.

---

## 3. Disney Audio-Animatronics and others

### 3.1 The Enchanted Tiki Room (1963)

**Primary source: US Patent 3,246,409, "Animated Figure"** (WED Enterprises; filed 1 November 1963; inventors Herbert B. Taylor, Wathel L. Rogers, Roger E. Broggie). It describes the Tiki bird (via summary of the patent text):
- A **two-track magnetic tape**: one track for the audio program, one for animation control.
- The control track carries "five superimposed frequencies … selected such that none of the frequencies constitutes a harmonic frequency" of the others. "Five conventional reed relays", "each … tuned to a separate one of the five frequencies", each drive a relay and then a solenoid air valve.
- The **beak is driven straight from the audio**: "The normal variation in signal amplitude which occurs in an audio program is sufficient to operate the solenoid … the beak opening with the higher amplitudes and closing with the smaller." This is envelope-follower lip sync, patented in 1963.
- Anticipation is written into the patent: the movements "are easily keyed to the audio portion of the program". The example given is "expansion of the birds breast just prior to anticipated opening of the birds beak."
- Per-movement speed is set mechanically: "the rapidity of each of the movements of the figure is easily adjusted and regulated by adjusting the pressure … so that, for example, turns of the head can be relatively abrupt while tilting of the body can be made more gradual."
- Movements are pneumatic (chosen to avoid hydraulic leaks). Return is by the figure's skin and springs: "the resilience of the covering … providing a bias force which tends to return the components."

**At room scale.** "The animation is a binary system, with only on/off moves", with a neutral rest position for each part (Wikipedia, *Audio-Animatronics*). Tones on tape "vibrate a metal reed that closes a circuit to trigger a relay, which sends a pulse of electricity to a mechanism that causes a pneumatic valve to move" (WDWNT; Wikipedia). Theatrecrafts: "AC audio signals which are rectified to pulsating DC". A 1963 *Orange County Register* line, quoted in search results: "a $1 million installation of electronics equipment, operated by a roll of 14-channel magnetic tape". Another account: 1" tape on 10½" reels, up to 14 tracks. An AllEars history (single source; via search) gives **225 figures, 100 speakers, 438 separate actions**. The equipment filled the basement, and its heat made the Tiki Room Disneyland's first air-conditioned attraction (PBS SoCal; WDWNT). The tape "also controlled the lighting and music through audio impulses" (PBS SoCal).

**Synthesis.** 438 actions on 14 tracks means about 30 tone channels per track, or (more plausibly) many figures sharing a channel. Bird choruses moved in sections, like a choir.

### 3.2 From the harness to DACS to digital animation

- **Harness.** For human figures (Carousel of Progress, 1964), "Wathel Rogers was rigged-up with a harness-like device" and his movements were recorded as signals. Disney's archive timeline calls it "a precursor of today's motion capture systems" (WDWNT, *A History Lesson*, *Audio Animatronics: Inside Out*).
- **Lincoln (1964):** "57 moves, including 22 different head movements" (WDWNT). Early figures stayed simple because "each individual cylinder requires its own control channel". The A-1 human hand grouped all four fingers on one actuator (Wikipedia).
- **DACS (Digital Animation Control System)**, built for Tokyo Disneyland and EPCOT. It used a Data General Eclipse S250 minicomputer and a custom **Animator's Console placed in front of the stage**. It "enabled an animator to incrementally generate up to **1000 channels** of show data synchronized with a sound track. Each channel was either an analog control or up to eight separate digital sub-channels." "A completed show dataset was compressed from magnetic tape backup to a single 2MB disk file", played back by a smaller Show Control Unit (Wikipedia). With the **Anicon** console, animators recorded movements and then used "a console of buttons and knobs" to "insert, delete, or adjust movements" (WDWNT; via summary). Sources date DACS anywhere from 1969 to 1981. The disagreement is real.
- **A-100 (1989): compliance.** "It generally takes about **eight hours to animate one second** of movement" (WDWNT, via summary). Hopper (*It's Tough to be a Bug*) has 68 or 74 functions depending on the source. The new Lincoln face has 45 functions in the face alone. Garner Holt's Yeti has more than 130 motions, over 30 of them in the face (InPark).
- **Davy Feiten** (animator at WED, Pixar and Garner Holt). From the Walt Disney Family Museum panel recap: characters "would need to be exaggerated more to read better from a distance". The work is "long and experimental, with constant adjustment", like "tuning a car". "Motions had to be layered out, one function, one body part at a time, beginning with the head." Figures are programmed in a studio and must "run continuously for at least 72 hours" before installation. On the Tomorrow Society podcast (via summary) he said he programmed by hand on the Anicon until he could run it "by feel". "every time you add a function, it's several thousands of dollars". Riders often see a figure for **three to five seconds**, so limited motion suffices. Weight, fur and costume slow motion and need compensation. Modern figures are animated off-stage in 3D and then tuned on site for **gain, offset and stroke**.
- **Line of action** (Imagineer quoted in a Jim Hill Media event report, via search): "you move the eyes, and then the head, and then the shoulders along this line of action."
- **Lumière, 2013** ("Pixels to Parks", Madhani et al., WDI and WDAS; read in full). The voice was recorded first, as in film. All animation was done in Maya against a modelled show room including guest sightlines. Animators block "pose-to-pose with step function curves--which are not physically possible with mechanical devices", so the rig enforced joint limits and turned rods and silicone a warning colour when overstretched. "Animation curves were analyzed at their first and second derivatives to check that velocity and acceleration did not happen in discontinuous ways or at speeds faster than the machinery could handle." Data was "exported from Maya, filtered, and then imported into a real-time, proprietary show system."
- **Realistic and Interactive Robot Gaze** (Disney Research and WDI, IROS 2020; via IEEE Spectrum). The figure is a 9-DOF bust: neck, eyes, lids, brows. Low-level behaviours run continuously: **breathing, small head movements, blinking, saccades**. Higher states (read, glance, engage, acknowledge) are layered over them in a subsumption architecture. The authors concede the illusion breaks "after a relatively short time".

**Note on terms.** "A-1000" is the generation used in *Star Wars: Galaxy's Edge* ("a fully functional face, featuring a full range of motion in the eyes and mouth"; Wikipedia). Disney's trademark for sensor-driven figures that decide their own actions is **Autonomatronics** (Otto, 2009; Lincoln 2009). I found no Disney system called "Automatronics".

### 3.3 Country Bear Jamboree (1971)

The show opened 1 October 1971 at Magic Kingdom with 18 Audio-Animatronics bears (plus mounted heads: buffalo, stag, moose). It was originally designed for the Mineral King ski resort (D23; WDWMagic via search). Bill Justice "programmed figures for … Pirates of the Caribbean, the Haunted Mansion and Country Bear Jamboree" (search summary of D23 and others). Feiten's remark that fur and costume weight slow these figures applies directly to the bears. CEI's Bear Country Jubilee (1977–78) was its pizza-parlour cousin, run on tone decoders.

### 3.4 Player instruments and robot bands

- **Pianocorder** (Superscope/Marantz, 1978–87): described in §1.2. It covers 80 notes and 2 pedals, with 128-bit frames at about 35 fps and per-frame 5-bit loudness for each half of the keyboard. About 350 cassettes were made, many converted from reproducing-piano rolls. This is the direct ancestor of the Rock-afire data.
- **Pat Metheny's Orchestrion** (2010; *Sound on Sound*, via summary). A Yamaha Disklavier is the core: "the first solenoid-based instrument that really represented a wide dynamic range". Guitar or MIDI keyboard triggers are recorded pass by pass into Digital Performer. The guitar-to-MIDI path has latency, so "I play ahead". The GuitarBot pluck is "under five milliseconds". Solenoids give "nowhere near that kind of throw or thrust", so dynamics are narrow. "without dynamics and without groove, it doesn't matter what kind of music it is." Mechanical noise counts: if the mic hears a squeak, "it's louder than the note, it's not gonna work." His first material failed because "Not one note of it worked", so he wrote to the machines' strengths.
- **Compressorhead** (Berlin, Frank Barnes et al., from 2007). The robots are made from recycled parts and "controlled via a MIDI sequencer". Stickboy has four arms and two legs (kick pedals), Schmidi works the hi-hat, Fingers had 78 fingers, Bones plays bass, and Mega-Wattson (2017) sings (Wikipedia).
- **Z-Machines** (Japan; Squarepusher's *Music for Robots*, Warp, 2014): Mach, a guitarist with 78 fingers; Ashura, a drummer with 22 arms; and Cosmo on keyboards. Squarepusher, via Singularity Hub/NPR search excerpts: the guitar robot "can play much faster than a human ever could, but there is no amplitude control." Making the EP took two months of "transferring and adapting data".

### 3.5 MIDI and timeline tools for haunts and hobby animatronics

- **VSA (Brookshire Software).** Timeline of servo, relay, DMX and dimmer tracks (128 to 256 depending on edition), synchronised with audio files. "Send commands at up to **30FPS**." It can "Capture events during playback with joystick, MIDI KORG nanoKONTROL2, or mouse" and "Automatically generate events based on the amplitude of the audio": the jaw from the waveform. Events can be dragged, shifted and scaled in groups.
- **Bottango.** Keyframes with "Bézier interpolation", 3D simulation of the figure, real-time hardware control or export to standalone Arduino code, and sync to "audio, video, and even external timecode sources" (SMPTE LTC). Its docs have sections on recording and puppeteering with control schemes, and on audio and microphone input.
- **Weigl ProCommander / Showforge** (the show controller used in many parks and in CEC's later stages). Console modes are "Play, Live, Touch, Latch and Record", which are mixing-desk automation modes. "Record live, refine on the timeline". MIDI, joystick, OSC and keyboard inputs, timecode "SMPTE / MTC / PTP", "power-up loops, sensor-triggered sequences", and Maya import.
- **FrightProps talking skulls**: "You play your audio into the skull and the skull does the rest!" There are auto-talk modes for the jaw, with eyes and neck on DMX.
- **ChatterPi** (Raspberry Pi jaw controller, Hackaday). It takes the average volume per audio chunk and maps it to servo positions by thresholds. Its "STYLE 2" first band-passes the audio to **500–2500 Hz** so that bass and sibilance don't flap the jaw. Head and eyes are a separate pre-programmed script.
- **"On the art of puppeteering"** (Hackaday log). Animation goes on "a separate, soundless MIDI channel", with NOTE_ON as a hit (open) and NOTE_OFF as a release, slid in the DAW to fine-tune. The servo took about 0.5 s full travel, so dense syllables made the mouth "shudder", and fast syllables had to be shortened. Velocity and pitch can scale how wide the mouth or eyes open.
- **Nuts & Volts, "A MIDI Christmas."** A controller maps **8 consecutive CCs** (bank-selectable over all 128) on one MIDI channel to 8 servos, with about 1/128 position resolution, and on/off outputs follow CC = 0 or ≠ 0. Typing values is "slow and hard to judge". Instead you record live with mod and pitch wheels or a joystick: "Start by working one character just as you would a puppet", one character at a time against recorded audio, then layer.
- **Gray Ventures patent US 4,949,327** (filed 1988; talking toys). It records the voice on one cassette track and **8 PWM channels** on the other, in about 17–20 ms frames (about 50–60 Hz), with no carrier. Operators work potentiometers live "in synchronism with the voice track", watching the figure move as they record.
- **xLights singing faces** (LED-display community). Lyrics go on a timing track, are broken down into words, then into **phonemes**, which are aligned by dragging. Each phoneme selects a mouth shape. Eyes on "Auto" "blink every few seconds when the rest phoneme is on." That means a blink is allowed only while the face is not singing.

---

## 4. The craft: what the sources say makes a band read as "playing"

Gathered from the practitioners above. Synthesis follows in Part 5.

1. **Act, don't trace.** Hagan says "you kind of want to be the character", "in a way it's acting". Disney's Feiten says to exaggerate so the motion reads at distance.
2. **Know the mechanism's vocabulary.** Hagan: "think of what the character's physical limitations are". Metheny: write to the machine. The Lumière rig enforced limits during animation, not afterwards.
3. **Mouths first, then everything else in layers.** ShowBiz always started with mouths. Disney layered one function at a time from the head down. Nuts & Volts did one character at a time like a puppet.
4. **Compensate for latency.** APS had per-programmer and per-bit offsets in frames, used mostly for mouths. Metheny plays ahead of the beat.
5. **Anticipate.** The 1963 patent's breast expands "just prior to" the beak. Engineered Arts: anticipations need "enough time so it reads on the robot".
6. **Different speeds for different joints.** The patent: "turns of the head can be relatively abrupt while tilting of the body can be made more gradual." Engineered Arts: "A head nod or body lean must be allowed enough time to play out."
7. **Secondary motion beats movement count.** The "Beach Bear Theory" video argues that a 16-movement Beach Bear beats a 16-movement Studio C Chuck. Chuck's movements are "mirrored", while Beach Bear has "secondary movement … in his surfboard his hair his legs … and most importantly his strumming hand which allows the arm to have a very floppy movement", a free arm, and the most visible body lean. "it's how those movements are executed that make one more advanced and fun to watch."
8. **Never twin; offset everything.** Engineered Arts: "Try not to twin movements … Even the slightest delay will help make the movement nicer if everything has some offset."
9. **Moving holds, not freezes,** says Engineered Arts. The Cyberamics' Random Movements Card filled the gaps between segments, and Disney's gaze work layers breathing, saccades and micro head motion under everything.
10. **Blinks belong to phrasing.** Engineered Arts warns against "RandomBlinkitus", meaning blinks not timed to a gesture or line. xLights blinks only on the rest phoneme. Engineered Arts also says to leave eye darts and blinks "to the very last".
11. **Eyes lead.** Eyes, then head, then shoulders (Imagineer, via Jim Hill). Animate the body before the eyes (Engineered Arts).
12. **Don't thrash.** "Don't make Robothespian move constantly or thrash about … gesture too much with each piece of dialogue."
13. **Instrument-playing has to show the music.** Hagan maps keyboard register to hand height: separate chords become alternating ups and downs, dense passages become fast back-and-forth. The New Rock-afire is criticised because "They don't play any of their instruments anymore. Their mechs all have the same capabilities, meaning none of them have any unique movements" (documentary).
14. **The stage is a performer.** Lights and spots are bits on the same chart. There is a spot per character, and curtains, organ lights and sign groups have their own bits. The Awesome Adventure Machine Chuck reads better than Rolfe because of "the stage it's present in" (Beach Bear Theory).
15. **What looks cheap.** Mirrored movements. Random movement unrelated to the song (Studio C's end state). Collapsing rich programs onto poor figures (Rosetta's many-to-one maps). Identical mechs with no unique gesture. Movement with no amplitude or dynamics (Squarepusher, Metheny). Audible mechanism noise. Mouths that shudder because syllables come faster than the actuator can travel.

---

## 5. Synthesis: what this means for a pixel scene

A pixel scene has none of the physical limits that forced these designs: no air pressure, no valve count, no reaction time. But the limits are what made the classic shows legible, and the sources keep saying so. The best course is to **adopt the constraints on purpose**:

- **A small, named movement vocabulary per performer.** The Cyberamics had 8, the Rock-afire 16–22. Each movement is a named, two-state (or three-state) channel with its own travel time, in the style of "Head Tip L", "Foot Tap", "Guitar Raise". The hardware equivalent of a curve is a pressure and flow setting per movement: the bit says *go*, and the movement's own easing and duration decide *how*. This keeps the data tiny and the motion consistent, the way a Pianocorder snapshot says only which valves are open.
- **Snapshot frames at a fixed rate are the right storage for a show.** APS uses 29.97 fps × 256 bits, and the Pianocorder 35.16 fps × 120 bits. Every frame is the whole state, so you can seek anywhere, which a game loop and a scrubber both need. Use commands (the Studio C style: pulse, fade, arm-after-N-frames, random-enable) for the *director* layer: segments, idle modes, triggers.
- **Two sources of motion per performer**, as in the Cyberamics. The **show program** (per song, authored or derived from tracks) plays while a song plays. The **random-movement program** plays in the gaps, so the figures never freeze. Add the Disney gaze layering underneath both: breathing, blinks and micro-motion as an always-on base that the show program overrides channel by channel.
- **Derived versus authored.** The 1963 Tiki beak followed audio amplitude directly. The ShowBiz mouths were puppeteered and then offset. A music-reactive scene will derive most motion from stems and MIDI. The sources suggest deriving the **mouth from a band-passed vocal envelope**, slightly *ahead* of the audio, and deriving **instrument actions from note events with their velocity**. Leave the "acting" channels (head turns, leans, looks at each other) to authored or rule-based cues, because those are exactly the channels that look random when derived.

---

## 6. Design lessons for the noodle cart band (each object a performer tied to tracks)

1. **Cast each object as one band member with one instrument and one personality,** as the Rock-afire did: Billy Bob is bass, Dook is drums. Suggested casting: **the cat sings lead** (vocal stem); **the lamps** are the hi-hat and cymbals, flickering and swinging on hats and crashes; **the sign** is the keyboard or synth, with letter groups lighting per chord the way the Rock-afire's organ and sign light groups did; **the table** is the drummer (kick thumps the legs, snare rattles the bowls and chopsticks); **the puddles** are the bass, rippling on bass notes with ripple size set by velocity; **the steam** is pads and backing vocals, swelling with sustained notes, an "ooh" choir like the Tiki birds.

2. **Give each performer a fixed bit chart of 6–20 named movements** and keep it in data, not code: for example `cat.mouth`, `cat.lidL`, `cat.lidR`, `cat.eyesL`, `cat.eyesR`, `cat.headTiltL`, `cat.headUp`, `cat.earL`, `cat.tail`, `cat.lean`, `cat.pawTap`. Number the lights and effects in the same chart, as ShowBiz did. The bit chart is the contract between the music mapping, the editor and the renderer.

3. **Make every movement a valve, not a position.** Each channel is on/off (or home/away-A/away-B, the New Rock-afire's two-bit servo trick for eyes and lids). The movement's own pre-tuned travel time and easing does the in-between. Tune "pressure" per movement: head turns snappy, body leans slow (the 1963 patent's exact example).

4. **Store shows as fixed-rate snapshot frames** (30 fps, one bitset or byte array per performer per frame), so scrubbing, seeking and looping are trivial. Put audio sync in the timeline, not in the frames, as APS did with SMPTE.

5. **Keep a separate director layer of commands** for segment changes, "random movement enable", "pulse for ½ second", "fade analog to X at rate Y" and "arm cue after N frames". This is the Studio C CCF opcode set, and it is a good minimal vocabulary.

6. **Never let a performer freeze.** Ship a random-movement program per performer for between songs and for quiet bars: slow blinks, the occasional ear flick, a lamp's lazy sway, steam idling. Make it a *pattern*, not uniform noise. The Cyberamics' version was an authored EPROM file (`.mvt`).

7. **Layer an always-on "alive" base under the show:** breathing (a 1–2 px chest or tail rise for the cat), lamp sway, steam drift, puddle shimmer. Show channels override it per channel, never wholesale. This is the Disney gaze subsumption idea.

8. **Derive the lead mouth from the vocal stem envelope, band-passed (roughly 500–2500 Hz) and thresholded into 2–3 openings,** with hysteresis. This is the 1963 Tiki beak plus ChatterPi's filter. If lyrics or phoneme timing exist, map phonemes to 4–6 pixel mouth shapes instead (xLights).

9. **Shift mouth motion earlier than the audio by a tunable offset,** per channel (APS had per-bit offsets for mouths). Mouths that open *with* the sound look late. Make the offset a setting, and set it by eye against the actual render latency.

10. **Cap the mouth's syllable rate at what the mouth can visibly travel.** Merge or skip syllables closer than about 2 frames of travel, or the mouth shudders (the Hackaday servo lesson). A held vowel should hold the mouth open, as Fechter's held button did.

11. **Anticipate big moves by 2–6 frames.** The cat inhales (chest up, ears back) before a vocal entrance. The lamp swings back before a crash. Steam gathers before a pad swells. The 1963 patent did exactly this: "expansion of the birds breast just prior to anticipated opening of the birds beak."

12. **Add follow-through and secondary motion to everything that hangs or floats:** lamp chains, the sign's hanging corner, the cat's tail, noodle steam, puddle rings. This is the Beach Bear Theory. A floppy strumming arm reads better than a rigid one, and secondary motion gives more liveliness per channel than extra channels do.

13. **Never twin left and right.** When both lamps react to one hit, offset them by 1–3 frames and vary amplitude. The same goes for both ears and both eyelids (a lid lagging by a frame reads as alive).

14. **Tie blinks to phrasing:** at phrase ends, on rests and on big downbeats after a long hold. Never blink at random during a sung line ("RandomBlinkitus"). Random blinks belong to the idle layer only.

15. **Eyes lead, head follows, body follows the head.** When the cat looks at the lamp for a cymbal hit, the eyes move first, the head a few frames later, and the lean after that.

16. **Map instrument actions from notes with dynamics.** For drums, kick, snare and hats each have their own movement, with velocity setting amplitude (a hard hit gets a bigger table jump and a brighter lamp). For bass, the puddle ripple radius follows velocity and the ripple rate follows note density. For keys, chord changes light the sign groups, with register setting *which* group (Hagan's low-is-down, high-is-up rule), and dense passages become fast alternation. No dynamics means no groove (Metheny, Squarepusher).

17. **Let one performer take focus in solos, and quiet the others.** During a sign or keys solo, the sign gets the full light vocabulary while the other performers drop to idle-plus-groove: a lamp nods on the beat, the cat sways and *looks at the sign*. Spotlighting was always a programmed channel ("Spots: Jasper, Munch, Helen…"). Dim and desaturate the non-soloists, the pixel equivalent of a dropped spot.

18. **Program reactions between performers.** The cat glances at the table on a drum fill. The steam puffs after the cat's high note as if impressed. Rolfe and Earl's whole act is one figure reacting to another. Call-and-response in the music (vocal line, then a sign flourish) should become a look-over, then the answer.

19. **Keep a "groove floor" for every playing performer:** one small on-beat movement (a head bob, a lamp nod, a foot or paw tap). Fatz and Billy Bob both had a foot tap for exactly this reason. Turn it off when the performer is supposed to be listening, not playing.

20. **Author by puppeteering, then edit.** Give the editor the ShowBiz rig: assign up to 8 channels to keys (an `.asg` preset such as "all mouths" or "cat head"), give each key a record-arm toggle, play the song, record a pass, then overdub other channels, with undo per pass. Weigl's Play/Live/Touch/Latch/Record modes are the modern form. Merging passes from different authors (Rock-afire Replay's feature) is collaboration for free.

21. **Do mouths first, then heads, then bodies, then lights,** the order ShowBiz and Disney both used. The derived pipeline can use the same order of precedence when channels compete.

22. **Treat lights as cast members.** The lamps' brightness and the sign's letter groups are channels in the bit chart, not post-effects. A strobe on the big hit and a blackout before the chorus are the "curtains and spots" of this stage.

23. **Respect the stage picture.** Riders see a Disney figure for 3–5 seconds, and a pixel scene's viewer sees it at small size. Exaggerate and simplify: a 1-pixel ear flick may not read, but a 3-pixel tail flip will (Feiten: "exaggerated more to read better from a distance").

24. **Avoid the four cheap tells:** (a) everything moving all the time ("thrash"); (b) motion unrelated to the song (Studio C's random mode during a show); (c) identical performers with interchangeable gestures (the New Rock-afire critique); (d) movement without dynamics, so every hit is the same size.

25. **Use derived motion for instruments and authored motion for acting.** Notes and envelopes are reliable for mouths, drum hits, ripples and lights. Looks, leans, reactions and solos read as intentional only when someone (or a deliberate rule) chose them. CEC's Rosetta shows what happens when rich intent is collapsed mechanically onto a poor channel set: inversions and many-to-one merges, and most of the acting is lost.

26. **When a song has no data, fall back gracefully,** the way Cyberamics stages ran random movements between segments. With no stems or MIDI, the scene should play the idle program plus a tempo-locked groove floor, not attempt audio-guessed acting.

27. **Version the "show tape" with its audio, as CEI did.** Programming data is worthless without the identical timing reference ("the programming tape and floppy always had to be kept together"). Key each authored show to a hash of its audio, and refuse to play it against different audio.

---

## Sources

Cheese-E-Pedia (fan wiki; the site is a single-page app, so the raw article URLs read are given):
1. Pianocorder Data Format: https://cheeseepedia.org/content/2vwi8wp0ikonmtr7/content.md
2. Biphase Mark Code: https://cheeseepedia.org/content/sv6qppgx2iim6t0g/content.md
3. APS Files: https://cheeseepedia.org/content/c4wgf0wuq0s1wl8x/content.md
4. Animation Programming System: https://cheeseepedia.org/content/yr7fhp7242299uzj/content.md
5. Big C's Cyberamics Center (SongCode control system, CEC Tester): https://cheeseepedia.org/content/evzqu325wz0nfa4e/content.md
6. SongCode: https://cheeseepedia.org/content/hsnjwmbzynzi90m6/content.md
7. Studio C File Formats: https://cheeseepedia.org/content/h3ntbnjellrfgno2/content.md
8. Cyberamic Control System: https://cheeseepedia.org/content/t0wwcqqaxr7f2ph3/content.md
9. CEI 4-Track Reel: https://cheeseepedia.org/content/qusxvt9d83j61wfu/content.md
10. Rock-afire Explosion Control System (Grey Box): https://cheeseepedia.org/content/1zmj6xj0ia5uezfo/content.md
11. New Rock-afire Explosion Control System: https://cheeseepedia.org/content/izd85uo0r23ekzql/content.md
12. Tone Decoder Control System: https://cheeseepedia.org/content/sjj1iyz3nswy8zjp/content.md
13. Layton Bit Stripper: https://cheeseepedia.org/content/6qaw5u1mdqg7ldt8/content.md
14. Bit Chart: https://cheeseepedia.org/content/j324axjypfqtg7bi/content.md
15. CEC-Stage Rosetta: https://cheeseepedia.org/content/quetnczyjsbvgplm/content.md
16. CEI Apple II Programmer: https://cheeseepedia.org/content/bkeg0b8ezn4458rv/content.md
17. Billy Bob (Animatronic): https://cheeseepedia.org/content/6p23d0nm36ehn0pv/content.md
18. Fatz Geronimo (Animatronic): https://cheeseepedia.org/content/rm82eda0vfhw3xq4/content.md
19. Mitzi Mozzarella (Animatronic): https://cheeseepedia.org/content/xfu35wd8gzp1vyqo/content.md
20. Dook LaRue (Animatronic): https://cheeseepedia.org/content/1u4r4nxdouwjla06/content.md
21. Beach Bear (Animatronic): https://cheeseepedia.org/content/sgyz2n821k4668ta/content.md
22. Rolfe DeWolfe & Earl Schmerle (Animatronic): https://cheeseepedia.org/content/li540lvd3v5ki00l/content.md
23. Looney Bird (Animatronic): https://cheeseepedia.org/content/8g2ia6hm3hi15zsd/content.md
24. Mr. Munch (Cyberamic): https://cheeseepedia.org/content/cvnzug2ieo1uvi35/content.md
25. Guest Star / Helen Henny (Cyberamic): https://cheeseepedia.org/content/6eaqi3jxasusmlp7/content.md
26. Chuck E. Cheese (Cyberamic): https://cheeseepedia.org/content/lan6hajx9ntxiery/content.md
27. Chuck E. Cheese 16m (Animatronic): https://cheeseepedia.org/content/46xiuulnk5mq2d1d/content.md
28. Interview with Brian Hagan, former Studio Manager of Chuck E. Cheese (transcript): https://cheeseepedia.org/content/25okpwmo0o6wn23u/content.md
29. Animatronics Experimenters Kit, Part 2, How to Program (Aaron Fechter, transcript): https://cheeseepedia.org/content/o7i0zaabwft09hu8/content.md
30. The Beach Bear Theory (transcript): https://cheeseepedia.org/content/qvhyrzjd01ipgke7/content.md
31. The Rock-afire Explosion: The Best Band You've Never Heard Of (video essay transcript): https://cheeseepedia.org/content/1odzy5m8tbedrv5s/content.md
32. The Rock-afire Explosion (2008 documentary transcript): https://cheeseepedia.org/content/v3zq1ev5ptbzxfss/content.md
33. Rock-afire Replay: https://cheeseepedia.org/content/3ctt8o9c9i5lbqqy/content.md
34. Reel to Real: https://cheeseepedia.org/content/vay8s9wc74xokbfl/content.md
35. RetroMation: https://cheeseepedia.org/content/wiq3kk0mr7v7ksdp/content.md
36. The Rock-afire Simulator: https://cheeseepedia.org/content/3meblagcgs746qfd/content.md
37. Cyberstar: https://cheeseepedia.org/content/ypih3k8tcw1wzmbt/content.md
38. Navori System: https://cheeseepedia.org/content/lliblls5k0twjtu0/content.md
39. Studio C: https://cheeseepedia.org/content/da937flheihh832q/content.md

Rock-afire and general:

40. Wikipedia, The Rock-afire Explosion: https://en.wikipedia.org/wiki/The_Rock-afire_Explosion
41. *Spin*, "Masters of Puppets" (2008): https://www.spinmagazine.com/2008/10/masters-puppets-rock-afire-explosion-story/

Disney:

42. US Patent 3,246,409, "Animated Figure" (WED Enterprises, filed 1963): https://patents.google.com/patent/US3246409A/en
43. Wikipedia, Audio-Animatronics: https://en.wikipedia.org/wiki/Audio-Animatronics
44. WDWNT archive, "Audio Animatronics: Inside Out": https://archive.wdwnt.com/?p=7822
45. WDWNT archive, "A History Lesson": https://archive.wdwnt.com/?p=9063
46. WDWNT, "The Complete History of Walt Disney's Enchanted Tiki Room": https://wdwnt.com/2023/06/the-complete-history-of-walt-disneys-enchanted-tiki-room/
47. Theatrecrafts, The Enchanted Tiki Room: https://www.theatrecrafts.com/pages/home/topics/themed-entertainment/disneyland-resort/the-enchanted-tiki-room/
48. PBS SoCal *Lost LA*, "The Enchanted Nuclear Robots of Disney's Tiki Room": https://pbssocal.org/shows/lost-la/the-enchanted-nuclear-robots-of-disneys-tiki-room
49. Walt Disney Family Museum, "The Early Days of Audio-Animatronics": https://www.waltdisney.org/blog/early-days-audio-animatronicsc
50. Walt Disney Family Museum, "A Feathered Family": https://www.waltdisney.org/blog/feathered-family-creating-birds-walt-disneys-enchanted-tiki-room
51. Walt Disney Family Museum, "Recap: Imagineering With Nuts & Bolts" (Feiten, Holt, Ferrante): https://waltdisney.org/blog/recap-imagineering-nuts-bolts
52. Tomorrow Society podcast, Davy Feiten: https://tomorrowsociety.com/davy-feiten-podcast/
53. Madhani et al., "Pixels to Parks: New Animation Techniques for Fantasyland" (WDI/WDAS, 2013): https://media.disneyanimation.com/uploads/production/publication_asset/99/asset/LumiereWriteup.pdf
54. IEEE Spectrum, "Disney Research Makes Robotic Gaze Interaction Eerily Lifelike": https://spectrum.ieee.org/disney-research-robotic-gaze
55. InPark Magazine, "It's a dimensional thing" (Garner Holt): https://www.inparkmagazine.com/its-a-dimensional-thing-garner-holt/amp/
56. IEEE Women in Engineering, "Engineering the Magic": https://wiemagazine.ieee.org/2008/05/30/engineering-the-magic/
57. D23, Country Bear Jamboree: https://d23.com/a-to-z/country-bear-jamboree/
58. AllEars, "The Enchanted Tiki Room – A look back" (225 figures / 438 actions; via search excerpt, fetch blocked): https://allears.net/blogs/jackspence/2011/08/the_enchanted_tiki_room_a_look_1.html
59. Jim Hill Media, "Marvelous Mechanized Magic Kingdom event…" (eyes → head → shoulders; via search excerpt): https://jimhillmedia.com/marvelous-mechanized-magic-kingdom-event-dispelled-many-myths-about-audio-animatronics/

Player instruments, robot bands, tools:

60. pianocorder.info: https://pianocorder.info/
61. *Sound on Sound*, "Pat Metheny's Orchestrion": https://www.soundonsound.com/people/pat-methenys-orchestrion
62. Wikipedia, Compressorhead: https://en.wikipedia.org/wiki/Compressorhead
63. Singularity Hub, Squarepusher and Z-Machines (via search excerpt): https://singularityhub.com/2014/03/01/squarepusher-explores-emotional-machine-music-with-78-fingered-robot-guitarist/
64. Brookshire Software VSA features: https://www.brookshiresoftware.com/vsa_features.htm
65. Bottango: https://www.bottango.com/ and https://docs.bottango.com/
66. Weigl ProCommander / Showforge: https://weiglcontrols.com/procommander
67. FrightProps Three Axis Talking Skull: https://www.frightprops.com/three-axis-talking-skull.html
68. Hackaday, ChatterPi: https://hackaday.io/project/181612-chatterpi/details
69. Hackaday, "On the art of puppeteering": https://hackaday.io/project/161523/log/153872-on-the-art-of-puppeteering
70. Nuts & Volts, "A MIDI Christmas": https://nutsvolts.com/magazine/article/a-midi-christmas
71. US Patent 4,949,327 (Gray Ventures; PWM animation track on cassette): https://patents.google.com/patent/US4949327
72. xLights manual, Singing Faces: https://manual.xlights.org/xlights/chapters/chapter-four-sequencer/singing-faces
73. Engineered Arts wiki, "Virtual Robot Tips & Tricks for Creating Performances": https://wiki.engineeredarts.co.uk/Virtual_Robot_Tips_%26_Tricks_for_Creating_Performances

### Gaps and conflicts

- I found no primary source for the Tiki Room's actual tone frequencies. The patent deliberately gives none.
- DACS dates disagree across sources (1969, 1970, 1971, 1979–81).
- The Tiki figure counts disagree (over 150, over 200, 225).
- The data layer of the Cyberstar S-VHS format is "scrambled" and not publicly documented. The community describes it only as a hidden audio channel carrying show data.
- I found no documented fan workflow that drives Rock-afire bits directly from MIDI. Fans program with keyboard keys in simulators and then export.
- The transcripts of Thrash's and Hagan's interviews are auto-captioned and lightly cleaned. The quotes keep their wording.
