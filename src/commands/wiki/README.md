# Wiki Commands

### /wiki

When invoked, this can be used to look up any term in the [KoL Wiki](https://wiki.kingdomofloathing.com/Main_Page). If the term is an item, the command will also spawn a great deal of of tertiary information, including:

- _Pricing:_ If tradeable, `oaf` will look up the current mall price, as well as the autosell.
- _Enchantment:_ If it has an enchantment, what that enchantment is.
- _Effect & Effect Link:_ If it is a potion or an item that confers an enchantment, what that enchantment is (and a link to the effect.)
- _Zap & Fold Groups:_ If it can be zapped or folded into other items, it will show the full group of associated items & the cheapest item among the group.
- _Quality:_ If it's food or booze, the quality rating of the item in question.
- _Equipment Type:_ If it's equipment, what kind of equipment it is (sword vs club, 1 vs 2 handed, et cetera)

If this in-game information becomes out of date, `oaf` can be told to reload data from Mafia's data files with **/rescan**.

This command has two possible invocations. You can invoke the following outcome either by typing `/wiki tamarind-flavored chewing gum` or `[[tamarind-flavored chewing gum]]`.

![image](https://user-images.githubusercontent.com/8014761/172411077-4fe06955-25d3-47b7-ba42-18f6e5e79601.png)

### /mafia

Similar to /wiki, /mafia searches the [KoLmafia Wiki](https://wiki.kolmafia.us/index.php) for the given term. This is quite useful when writing new code or trying to show others useful ASH commands or ASH reference material.

![image](https://user-images.githubusercontent.com/8014761/172417662-236b2ea3-6da0-488f-a76a-30c5cdf81848.png)

### /pizza

When invoked, ~~orders you a pizza~~. OK, no, it doesn't do that. This command goes through the list of possible pizza effects and predicts what pizza effect your pizza would spawn if you were to put ingredients with those first letters into the [Diabolic Pizza Cube](https://wiki.kingdomofloathing.com/Diabolic_pizza_cube). For wildcards at the end, use \* or simply do not fill in the closing letters.

![image](https://user-images.githubusercontent.com/8014761/172419808-e98fe63d-5a6e-40c3-a303-2b4da1804de9.png)
