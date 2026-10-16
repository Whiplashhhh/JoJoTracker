# JoJo's Bizarre Adventure: episode catalog sources (built 2026-10-16)

## How this was collected (read first)

- **No page was read directly.** WebFetch returned `ECONNREFUSED` / "Command failed" for every host, including fr/en.wikipedia.org, jojowiki.com, wikiwand.com and example.com. curl is also blocked. The sandbox was not bypassed.
- **All data comes from WebSearch result summaries.** About 200 extended searches were run, which used up the session's web search budget.
- **Typography is unverified.** Titles are as the search summaries reported them, not copied from the source tables. Exact characters were never checked: hyphen vs en dash, straight vs curly apostrophes, the French space before `!`/`?`/`:`, and capitalisation. All apostrophes and quotes in the file are ASCII. A verification pass with a working WebFetch is recommended before production use.
- **The secondary sources used are real sources, not inventions.** Several values come from sources other than Wikipedia. jojowiki was one of the allowed sources; animotaku.fr and similar French sites were also used. Each case is listed per part below. Where sources conflicted, or the title could only be guessed, the value is `null`.

## Conventions chosen

- **airDate for Parts 1–5:** the Japanese calendar date of the Tokyo MX broadcast, as English Wikipedia and jojowiki give it (a Saturday, because the show aired after midnight).
  - French Wikipedia consistently lists the previous day (Friday) for every part, so it is one day earlier.
  - For Part 3 and Part 4, the per-episode dates were derived as consecutive weeks from the English Wikipedia season start date. Each derivation ends exactly on the English Wikipedia season end date, so the runs had no gaps:
    - Stardust Crusaders: 2014-04-05 → 2014-09-13
    - Battle in Egypt: 2015-01-10 → 2015-06-20
    - Diamond is Unbreakable: 2016-04-02 → 2016-12-24
  - jojowiki spot checks matched this.
- **airDate for Part 6:** the Netflix worldwide batch date. The Japanese TV dates were Saturdays from 2022-01-08 to 2023-04-08 and are not stored.
- **airDate for Part 7:** the Netflix release date.
- **titleEn for Golden Wind and Stone Ocean:** English Wikipedia writes these as `original / Netflix-localized`, for example "Moody Blues' Counterattack / Moody Jazz's Counterattack". The first half (the original or literal title) is used. For Golden Wind eps 8–39, the jojowiki titles follow that same original style.
- **Season keys:**
  - Part 3: `stardust-crusaders` ("Stardust Crusaders") and `battle-in-egypt` ("Battle in Egypt"). English Wikipedia names the halves this way; jojowiki uses "Stardust Crusaders: Battle in Egypt"; French jojowiki uses "Bataille en Égypte".
  - Part 6: `stone-ocean-1/2/3`, named "Stone Ocean (épisodes 1–12 / 13–24 / 25–38)". No official batch names were found. English Wikipedia files them as one "Season 5: Stone Ocean" released in three parts. Press and Netflix coverage says "Part 1/2/3", and jojowiki calls episodes 13–24 "Chapter 2".
  - Parts 1, 2, 4, 5 and 7: `season: null`, with an empty `seasons` array.
- **Recaps:** the Golden Wind recaps 13.5, 21.5 and 28.5 are not counted.

## URLs used (as returned by search)

- **French Wikipedia** (all parts, single page with no per-series sub-pages seen): https://fr.wikipedia.org/wiki/Liste_des_%C3%A9pisodes_de_JoJo%27s_Bizarre_Adventure
- **English Wikipedia:**
  - https://en.wikipedia.org/wiki/List_of_JoJo%27s_Bizarre_Adventure_episodes
  - https://en.wikipedia.org/wiki/JoJo%27s_Bizarre_Adventure_season_1
  - https://en.wikipedia.org/wiki/JoJo%27s_Bizarre_Adventure:_Stardust_Crusaders
  - https://en.wikipedia.org/wiki/JoJo%27s_Bizarre_Adventure:_Diamond_Is_Unbreakable
  - https://en.wikipedia.org/wiki/JoJo%27s_Bizarre_Adventure:_Golden_Wind
  - https://en.wikipedia.org/wiki/JoJo%27s_Bizarre_Adventure:_Stone_Ocean
- **jojowiki:**
  - https://jojowiki.com/List_of_JoJo%27s_Bizarre_Adventure_Episodes
  - https://jojowiki.com/Stardust_Crusaders_(Anime) and its /fr version
  - https://jojowiki.com/Diamond_is_Unbreakable_(Anime)
  - https://jojowiki.com/Golden_Wind_(Anime)
  - https://jojowiki.com/Stone_Ocean_(Anime)
  - https://jojowiki.com/Season_6
  - https://jojowiki.com/SBR_Episode_1 … SBR_Episode_6
- **Other sites:**
  - https://animotaku.fr/blog/jojos-bizarre-adventure-ordre-liste-episodes-saisons-arcs/
  - https://dondon.media/jojos-bizarre-adventure-liste-des-episodes-et-des-arcs/
  - http://www.planete-jeunesse.com/fiche-3029-jojo-s-bizarre-adventure-stardust-crusaders.html
  - https://www.allocine.fr/series/ficheserie-4281/
  - https://www.justwatch.com/us/tv-show/jojos-bizarre-adventure-1993/season-1
  - https://www.rottentomatoes.com/tv/jojos_bizarre_adventure/s01
  - https://www.animenewsnetwork.com/encyclopedia/anime.php?id=15692
  - https://www.gamesradar.com/entertainment/anime-shows/jojos-bizarre-adventure-steel-ball-run-2nd-stage-3rd-stage-release-date-time-netflix/
  - https://www.netflix-news.com/articles/programmes/nouveautes/1627676-steel-ball-run-la-course-la-plus-folle-de-jojo-repart-sur-netflix-des-le-25-septembre-25-09-2026/
  - https://www.soapcentral.com/anime/steel-ball-run-jojo-s-bizarre-adventure-complete-release-schedule-all-episodes-air

## Per part

### Part 1: Phantom Blood (eps 1–9), all titles filled

- **FR:** French Wikipedia.
- **EN:** English Wikipedia, except eps 5 "The Dark Knights" and 6 "Tomorrow's Courage". Their Wikipedia rows were never shown, so those two come from the JustWatch streaming listing and jojowiki.
- **Note:** English Wikipedia uses localized streaming titles, for example ep 7 "Sorrowful Successor" where jojowiki has "The Successor".

### Part 2: Battle Tendency (official 10–26)

- **FR:**
  - Eps 10–23 come from French Wikipedia.
  - Eps 24–26 come from animotaku.fr only, because French Wikipedia's rows were not visible in search results: "Les liens qui unissent JoJo", "La naissance de l'être suprême !" and "L'homme qui devint un dieu !". animotaku's titles match French Wikipedia everywhere else, but these three are flagged.
- **EN:**
  - English Wikipedia for 10–12, 14, 15, 17–19 and 23. Ep 23, "The Warrior of Wind", is medium confidence; jojowiki has "The Warrior Returns to the Wind".
  - Streaming listings (JustWatch, HBO Max, Peacock, Tubi) for 13, 16 and 20–22.
- **EN null for 24, 25 and 26:** sources conflict.
  - 24: "The Ties that Bind JoJo" / "The Bond That Binds JoJo" / "The Link to JoJo"
  - 25: "Birth of the Ultimate Being!" / "The Birth of a Superbeing!!"
  - 26: "The Ascendant One" / "The Man Who Became a God"
- **Dates:** there was no broadcast on 2012-12-29.

### Part 3: Stardust Crusaders (1–24) and Battle in Egypt (25–48)

- **FR, eps 1–13:** French Wikipedia. Ep 13 is moderate confidence. Ep 9 "Yellow Temperence" keeps the source's spelling.
- **FR, eps 14–24:** French Wikipedia rows were not visible, so these come from dondon.media, planete-jeunesse and encyclopedia-anime. Those sources mixed `-` and `–`; a plain hyphen " - Partie N" was used to match French Wikipedia eps 10–11.
- **FR null:**
  - Ep 22: no source found.
  - Eps 42–44: sources conflict. French Wikipedia appears to say "Cool Ice, Miasmes d'outre-espace (n)", AlloCiné "Vanilla Ice, Miasmes d'outre-espace - Partie n", and jojowiki fr "Vanilla Ice, Miasmes du Vide, partie n".
- **FR, Egypt eps 25–37 and 40–41:** credited to French Wikipedia in search summaries, but the separator format varies between ", partie N", " - Partie N" and "(N)". For eps 40–41, the " - Partie N" suffix was assumed from eps 34–35. These need a verbatim check.
- **FR from jojowiki fr and other sites:** eps 38–39 and 45–47 come from jojowiki fr (eps 38–39 also from AlloCiné and animotaku). Ep 48 comes from jojowiki fr and Planète Jeunesse.
- **EN:** English Wikipedia's episode table was never shown in search results, so every English title comes from jojowiki, with fandom and ANN as cross-checks.
- **EN null:**
  - Ep 22: only ANN "Judgement (Part 2)" was seen.
  - Eps 36–37: conflict between "Hol Horse and Boingo" and "Hol Horse and Mondatta".

### Part 4: Diamond is Unbreakable (1–39)

- **FR:** French Wikipedia for all 39. The " - Partie N" separator was confirmed on eps 3 and 8. Spellings are kept as the source has them: ep 7 "Toshizaku" (a source typo) and ep 39 "Morio".
- **EN:** jojowiki for all, because English Wikipedia's table was not visible. Ep 25 is null because the English title came back garbled; FR "Atom Heart Father".
- **Discrepancy:** French Wikipedia gives ep 13 as 2016-06-23 (a Thursday), which looks like a source error. jojowiki gives 2016-06-25, which is the date used.

### Part 5: Golden Wind (1–39), all titles filled

- **FR:** French Wikipedia, which uses the localized Stand names (for example "Moody Jazz contre-attaque") and shows the originals as alternative titles. Points to check:
  - "Six bullets" vs "Six Bullets" in eps 7–8
  - Ep 2 "Bucciarati" (jojowiki fr has "Buccellati")
  - Ep 37 came from a single summary
- **EN:**
  - English Wikipedia's first half (the original title) for eps 1–7. Ep 5 may be missing a localized half.
  - jojowiki for eps 8–39.
- **Dates:** jojowiki and English Wikipedia (Saturday). Eps 38 and 39 both aired on 2019-07-28.

### Part 6: Stone Ocean (1–38)

- **EN:** all from the English Wikipedia list (first half of the "X / Y" form). The Netflix halves include "Prisoner FE40536: Jolyne Cujoh", "F.F.", "Debt Collector Mary Lynn Manson", "Operation Savage Guardian…", "Smack of Love and Revenge", "Enter the Drake's Dream", "Lock of the Jail!", "Bohemian Ecstatic", "Sky Guy", "Netherworld", "Heavy Forecast" and "It's a Wonderful World".
- **FR, eps 1–6:** French Wikipedia (the summary called the snippet partly garbled).
- **FR, eps 7–11:** animotaku.fr, with AlloCiné also confirming eps 7 and 9.
- **FR null for 27 episodes:**
  - Ep 12: only one source (comic.systems: "Avis de tempête").
  - Eps 13–38: the search budget ran out before any French titles could be found.

### Part 7: Steel Ball Run (1–12)

- **EN:** English Wikipedia and jojowiki for eps 1–5. Eps 6–12 are null because they are unreleased and jojowiki marks their titles TBA.
- **FR:** null for all. No French Wikipedia rows or Netflix France titles were found. Nautiljon has "La Requête du Shérif" (ep 2) and "Les bandits du désert" (ep 3), but these are unconfirmed and not used.

## Steel Ball Run date evidence

- **Ep 1, 2026-03-19:**
  - English Wikipedia lists overall #191 "Steel Ball Run" as released March 19, 2026.
  - jojowiki SBR_Episode_1 says it was released only on Netflix on that date, as the long-format "1st Stage".
  - French Wikipedia's article states "191 épisodes au 19 mars 2026".
- **The weekly run:**
  - English Wikipedia: the next cour "will consist of 11 episodes", released weekly from September 25, 2026.
  - jojowiki Season_6: 11 episodes covering the 2nd and 3rd stages from 2026-09-25, with the table going up to overall #202.
- **Per-episode confirmations:**
  - Ep 2, 09-25: jojowiki and Rotten Tomatoes.
  - Ep 3, 10-02: English Wikipedia.
  - Ep 4, 10-09: English Wikipedia and jojowiki.
  - Ep 5, 10-16 (today): English Wikipedia and GamesRadar ("October 16, at 1:00 AM Pacific").
  - Ep 12, 12-04: soapcentral and others ("expected to end on December 4, 2026").
- **Eps 6–11 (10-23 → 11-27):** the Fridays in between. No source announces each date individually.
- **France:** Netflix News FR confirms the Netflix France release from 25 September.
- **Discrepancies:**
  - The English Wikipedia Steel Ball Run infobox still says "4 episodes" (stale).
  - FuransuJapon's calendar puts ep 2 on Oct 2 (an outlier).
  - The reported release time of ep 2 varies between 12, 1 and 2 AM PT.
  - A GamesRadar mention of later batches (an unconfirmed leak) falls outside the 12-episode run.
  - An English Wikipedia summary said "194 episodes as of October 2026", which is stale by one episode. Five episodes are out as of 2026-10-16.

## Structure vs expectations

- Every expected count is confirmed: 9 / 17 / 48 / 39 / 39 / 38 / 12, for 202 total.
- Numbering matches expectations.
- **One addition:** as of 2026-10-16, five Steel Ball Run episodes have been released, not four, because ep 5 came out today.

## Vérifications complémentaires (agent principal, 16/10/2026)

Recherches ciblées après la collecte :

- **P3 ép. 22** : titre anglais « Judgement, Part 2 » confirmé par JoJo Wiki (`SC_Episode_22`) et Peacock. Titre français laissé `null` (non trouvé tel quel).
- **P3 ép. 36–37** : JoJo Wiki (`SC_Episode_36`) donne « Hol Horse and Boingo, Part 1/2 » ; retenu comme titre anglais (« Hol Horse and Mondatta » est la variante localisée des plateformes).
- **P2 ép. 26 (n° officiel 26)** : « The Ascendant One » confirmé par Anime News Network (sondage JoJo Day 2025, titres anglais officiels). Ép. 24 et 25 : anglais laissé `null` (sources contradictoires), le titre français est affiché.

Limite connue : aucune page source n'a pu être ouverte intégralement depuis l'environnement de travail (réseau restreint) ; les titres proviennent des extraits de recherche. Une relecture mot à mot reste conseillée (voir README, « Ajouter ou corriger des épisodes »).
