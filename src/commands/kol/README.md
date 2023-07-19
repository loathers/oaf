# KoL Commands

These commands engage with KoL itself.

### /spade

When invoked, this command tests the Kingdom for the existence of new items. There are a variety of tricky and silly ways that you can test the status of new unreleased items in the Kingdom. `oaf` can detect the existence and tradeability of an item, as well as whether the item is food, booze, spleen, an offhand, or familiar equipment. This is commonly used before new IOTMs or paths are released, to get a sense of what the new IOTM will be adding to the game.

![image](https://user-images.githubusercontent.com/8014761/172412074-0ea3fdcb-2482-4feb-88b0-d4fa816c7fe8.png)

### /leaderboard

When invoked, this command generates a path ascension leaderboard, showing the gold, silver, and bronze finishers for that particular season (or, if it is an active board, the current holders of those categorizations). The boards are associated with the # in the board's URL, which is roughly correlated to [Path ID](https://kol.coldfront.net/thekolwiki/index.php/Paths_by_number) but (annoyingly) not entirely correlated. Still, this is useful whenever you want to see what the native KoL Boards showed for a challenge path in the distant past, or (more usefully) the current path when the season is competitive in the last month or so.

![image](https://user-images.githubusercontent.com/8014761/172418964-be08e036-afa8-46ea-9fc1-4adc46a254ef.png)

- **/itemdrop** -- When passed a drop rate, /item generates the +item% needed to cap the drop.
- **/fairy & /reversefairy** -- /fairy gives the +item% provided by a fairy of X weight. /reversefairy gives the weight needed for X +item%.
- **/leprechaun** -- /leprechaun gives the +meat% provided by a basic leprechaun of X weight. (Has a similar /reverseleprechaun option.)
- **/volleyball** -- /volleyball gives the +stat provided by a basic volleyball of X weight.
- **/level & /stat & /substat** -- General stat commands; /level is the stat/substat needed for that level, /stat is substats for a given mainstat, /substat is the mainstat and level for a given number of substats.
