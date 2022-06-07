# OAF-JS
## A Discord Bot for the Ascension Speed Society
Welcome to O.A.F.! This is a bot built specifically for the Ascension Speed Society, a Discord server based around speedrunning in the Kingdom of Loathing. It has a truly startling number of features. It has (probably) changed since you last used it, so please read the following overview to understand how to use OAF: The Next Generation. 

## General Usage
Formerly, OAF was invoked using ! commands. **This is no longer the case.** To invoke OAF, you now use *slash* commands. To see OAF options in the Discord window, all you have to do is type a single backslash; when you do, a long list of possible commands is spawned, like so:

![image](https://user-images.githubusercontent.com/8014761/172405756-b030ee08-9c5d-4cff-9dbd-157e8ffbc7bb.png)

This should (in theory) make OAF relatively self-documenting, as each command has its own string describing the action. For the purposes of thorough documentation, we will also document these all here, starting from the most-used commands to the least-used commands. (Please note that this readme was last updated on June 7th, 2022; we will try to keep this up-to-date, but there may be small syntax changes in the coming months as we identify issues in usage.)

------------------------------

## Core OAF Commands
### /wiki
When invoked, this can be used to look up any term in the [KOL Wiki](https://kol.coldfront.net/thekolwiki/index.php/Main_Page). If the term is an item, the command will also spawn a great deal of of tertiary information, including:
- *Pricing:* If tradeable, OAF will look up the current mall price, as well as the autosell.
- *Enchantment:* If it has an enchantment, what that enchantment is.
- *Effect & Effect Link:* If it is a potion or an item that confers an enchantment, what that enchantment is (and a link to the effect.)
- *Zap & Fold Groups:* If it can be zapped or folded into other items, it will show the full group of associated items & the cheapest item among the group. 
- *Quality:* If it's food or booze, the quality rating of the item in question.
- *Equipment Type:* If it's equipment, what kind of equipment it is (sword vs club, 1 vs 2 handed, et cetera)

This command has two possible invocations. You can invoke the following outcome either by typing `/wiki tamarind-flavored chewing gum` or `[[tamarind-flavored chewing gum]]`.

![image](https://user-images.githubusercontent.com/8014761/172411077-4fe06955-25d3-47b7-ba42-18f6e5e79601.png)

### /mafia
Similar to /wiki, /mafia searches the [KOLMafia Wiki](https://wiki.kolmafia.us/index.php) for the given term. This is quite useful when writing new code or trying to show others useful ASH commands or ASH reference material.

![image](https://user-images.githubusercontent.com/8014761/172417662-236b2ea3-6da0-488f-a76a-30c5cdf81848.png)

### /remind
When invoked, this command generates a reminder that can be used to remind yourself to do things, either in-game or out-of-game. The command has a "when" option, in which you'll put how long in the future you want the reminder to be (formatted as "1d2h" or "3h" or "30m"). If you would like OAF to ping you ten minutes after rollover, you can also use `rollover` as the "when" parameter. As seen in the screenshot, you can (and should) put a specific message in the reminder outlining what it is you want to be reminded of.

![image](https://user-images.githubusercontent.com/8014761/172413083-1bf7ea24-f342-4423-8d59-4c97fa7b2fb6.png)

### /spade
When invoked, this command tests the Kingdom for the existence of new items. There are a variety of tricky and silly ways that you can test the status of new unreleased items in the Kingdom. OAF can detect the existence and tradeability of an item, as well as whether the item is food, booze, spleen, an offhand, or familiar equipment. This is commonly used before new IOTMs or paths are released, to get a sense of what the new IOTM will be adding to the game. 

![image](https://user-images.githubusercontent.com/8014761/172412074-0ea3fdcb-2482-4feb-88b0-d4fa816c7fe8.png)

### /leaderboard
When invoked, this command generates a path ascension leaderboard, showing the gold, silver, and bronze finishers for that particular season (or, if it is an active board, the current holders of those categorizations). The boards are associated with the # in the board's URL, which is roughly correlated to [Path ID](https://kol.coldfront.net/thekolwiki/index.php/Paths_by_number) but (annoyingly) not entirely correlated. Still, this is useful whenever you want to see what the native KOL Boards showed for a challenge path in the distant past, or (more usefully) the current path when the season is competitive in the last month or so.

![image](https://user-images.githubusercontent.com/8014761/172418964-be08e036-afa8-46ea-9fc1-4adc46a254ef.png)

### /pizza
When invoked, ~~orders you a pizza~~. OK, no, it doesn't do that. This command goes through the list of possible pizza effects and predicts what pizza effect your pizza would spawn if you were to put ingredients with those first letters into the [Diabolic Pizza Cube](https://kol.coldfront.net/thekolwiki/index.php/Diabolic_pizza_cube). For wildcards at the end, use * or simply do not fill in the closing letters.

![image](https://user-images.githubusercontent.com/8014761/172419808-e98fe63d-5a6e-40c3-a303-2b4da1804de9.png)

------------------------------

## Dreadsylvania Commands
ASS currently has a relatively active set of free-use community Dungeons used collaboratively to get people skills. This set of commands are used to dig into the dungeon and provide information to our dungeon runners and dungeon managers. 

### /status
When invoked, this command will spawn a quick summary of the active Dread instances. Summary includes turns spent in each zone (formatted as "Forest/Village/Castle") and the number of skills left in [The Machine](https://kol.coldfront.net/thekolwiki/index.php/The_Machine)

![image](https://user-images.githubusercontent.com/8014761/172421429-7d7a4b03-61f3-4825-879e-b21e6a30f6d2.png)

### /clan
When invoked, this command will spawn a table that includes a lot of information about the current status of that clan's dungeon. This includes things like the status of NCs (mainly availability, but also the path used to get to the available NC), the projected boss given banishes and the alignment of kills, and the kills remaining. This is effectively a much expanded version of **/status**. The two available clans currently are `cdr1` and `cdr2`. 

![image](https://user-images.githubusercontent.com/8014761/172420877-1b6eddc2-9c47-4f21-bf3a-b76dc3167bd9.png)

### /skills
When invoked, this command shows the number of skills each user is owed according to the number of turns they've spent in our Dreadsylvania dungeons. The way our collaborative dungeons work is that all turns spent churning the dungeons translate to owed skills; OAF is able to look at the skills acquired by individuals and compare them to total involvement in the ASS dungeons to assess how many skills people are owed. To manage this list, use the **/done & /undone** commands to take users off (or add them back) when they have completed all their Dreadsylvania skills (or forget to perm one).

![image](https://user-images.githubusercontent.com/8014761/172422468-80769cb7-8b8c-45b5-a554-b4f682c6d46f.png)

### /brains
When invoked, this command will assess the status of various possible users that could (in theory) be available brains for people who want to use [The Machine](https://kol.coldfront.net/thekolwiki/index.php/The_Machine) in a Dread instance to get skills and report back their classes. 

![image](https://user-images.githubusercontent.com/8014761/172420340-6662a773-7e2a-441c-82de-5a1066203b54.png)

### /whitelist
When invoked, this command will add a new user to the whitelist for our Dreadsylvania free-use clans. Note that this command may only be invoked by users with moderator powers in the Discord, to avoid people whitelisting themselves and stealing some of the items from the clan stashes.

------------------------------

## OAF Control Commands
These commands are used to control OAF when OAF gets too powerful. Screenshots not included, for obvious reasons.

### /oops
Purges the last message OAF sent in the current channel. Useful if you typo'd something and want to hide the evidence.

### /purge
Purges the last X messages OAF sent in the current channel. Useful if you typo'd your existence as a human being and would like to hide the evidence more thoroughly.

------------------------------

## Fun Commands
These are mostly just little fun things, or mildly helpful shorthand when you don't want to do the mental math. Screenshots not included, as these are all relatively simplistic.

- **/orb** -- Provides a randomized magic 8-ball prediction to an asked question. 
- **/item** -- When passed a drop rate, /item generates the +item% needed to cap the drop.
- **/fairy & /reversefairy** -- /fairy gives the +item% provided by a fairy of X weight. /reversefairy gives the weight needed for X +item%.
- **/leprechaun** -- /leprechaun gives the +meat% provided by a basic leprechaun of X weight. (Has a similar /reverseleprechaun option.)
- **/volleyball** -- /volleyball gives the +stat provided by a basic volleyball of X weight.
- **/level & /stat & /substat** -- General stat commands; /level is the stat/substat needed for that level, /stat is substats for a given mainstat, /substat is the mainstat and level for a given number of substats.
- **/prswelcome** -- Primarily for LASS devs. Generates a link for a given repository that shows all PRs & Issues that have been assigned to you in that repository.
- **/roll** -- Rolls dice. Basically every bot can do this. Syntax is "4d7" where the first number is the number of dice and the second is the number of sides of the dice.

------------------------------

This bot was originally built by [Alistair Crook](https://github.com/Phillammon), and is currently maintained by the Loathing Associates Scripting Society (LASS). We are all deeply grateful for the yeoman's work Alistair did in setting up OAF (and hopping back in to upgrade it liberally.)
