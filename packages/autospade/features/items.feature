Feature: Spade an item
  @Exists
  Scenario: The item exists
    When I equip the item
    Then the response does not contain "Nopers"

  Scenario: The item is tradeable
    When I visit "town_sellflea.php?sellprice=100&selling=Yep.&whichitem={id}"
    Then the response does not contain "That item cannot be sold or transferred"

  Rule: Only one can be true
    Scenario: The item is an off-hand equipment
      When I equip a dripping meat crossbow
      And I equip the item
      Then the response contains "You can't equip an off-hand item while wielding a 2-handed weapon"

    Scenario: The item is a ranged weapon
      Given I know Double-Fisted Skull Smashing
      When I equip a seal-clubbing club to my weapon slot
      And I equip a seal-clubbing club to my off-hand slot
      And I equip the item
      Then the response contains "You can't equip a ranged weapon with a melee weapon in your off-hand"

    Scenario: The item is a Mysticality weapon
      Given I know Double-Fisted Skull Smashing
      When I equip a disco ball to my weapon slot
      And I equip a disco ball to my off-hand slot
      And I equip the item
      Then the response contains "You can't equip a Mysticality weapon with a ranged weapon in your off-hand"

    Scenario: The item is a melee weapon
      Given I know Double-Fisted Skull Smashing
      When I equip a disco ball to my weapon slot
      And I equip a disco ball to my off-hand slot
      And I equip the item
      Then the response contains "You can't equip a melee weapon with a ranged weapon in your off-hand"

  Rule: Only one can be true
    Scenario: The item is a generic familiar equipment
      Given I have a Ghost of Crimbo Commerce familiar
      When I use my Ghost of Crimbo Commerce familiar
      And I equip the item
      Then the response contains "Ghosts can't wear equipment"

    Scenario: The item is a specific familiar equipment ($1)
      Given I have a Mosquito familiar
      When I use my Mosquito familiar
      And I equip the item
      Then the response matches "Only a specific familiar type ($1) can equip this item"

  Rule: Only one can be true
    Scenario: The item is a food
      When I eat the item
      Then the response contains "You don't have the item you're trying to use"

    Scenario: The item is a booze
      When I drink the item
      Then the response contains "You don't have the item you're trying to use"

    Scenario: The item is a spleen item
      When I chew the item
      Then the response contains "You don't have the item you're trying to use"
