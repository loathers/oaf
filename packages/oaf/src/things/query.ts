import { createClient } from "data-of-loathing";

const client = createClient();

export type TData = Awaited<ReturnType<typeof getQueryData>>;

export const getQueryData = async () =>
  client.query({
    allItems: {
      nodes: {
        id: true,
        name: true,
        image: true,
        descid: true,
        uses: true,
        quest: true,
        tradeable: true,
        discardable: true,
        gift: true,
        plural: true,
        autosell: true,
        itemModifierByItem: {
          modifiers: true,
        },
        foldablesByItem: {
          nodes: {
            foldGroupByFoldGroup: {
              foldablesByFoldGroup: {
                nodes: {
                  itemByItem: {
                    id: true,
                    name: true,
                    image: true,
                    tradeable: true,
                  },
                },
              },
            },
          },
        },
        zapGroupItemsByItem: {
          nodes: {
            zapGroupByZapGroup: {
              zapGroupItemsByZapGroup: {
                nodes: {
                  itemByItem: {
                    id: true,
                    name: true,
                    image: true,
                    tradeable: true,
                  },
                },
              },
            },
          },
        },
        consumableById: {
          adventureRange: true,
          adventures: true,
          stomach: true,
          liver: true,
          spleen: true,
          levelRequirement: true,
          quality: true,
        },
        equipmentById: {
          power: true,
          moxRequirement: true,
          mysRequirement: true,
          musRequirement: true,
          type: true,
        },
      },
    },
    allSkills: {
      nodes: {
        id: true,
        name: true,
        image: true,
        tags: true,
        mpCost: true,
        skillModifierBySkill: {
          modifiers: true,
        },
      },
    },
    allEffects: {
      nodes: {
        id: true,
        name: true,
        image: true,
        descid: true,
        quality: true,
        nohookah: true,
        effectModifierByEffect: {
          modifiers: true,
        },
      },
    },
    allFoldGroups: {
      nodes: {
        foldablesByFoldGroup: {
          nodes: {
            item: true,
          },
        },
      },
    },
    allMonsters: {
      nodes: {
        id: true,
        name: true,
        image: true,
        meat: true,
        attack: true,
        defence: true,
        hp: true,
        scaling: true,
        scalingFloor: true,
        scalingCap: true,
        phylum: true,
        element: true,
        initiative: true,
        free: true,
        nocopy: true,
        boss: true,
        ultrarare: true,
        wiki: true,
        monsterDropsByMonster: {
          nodes: {
            itemByItem: {
              name: true,
              id: true,
            },
            rate: true,
            category: true,
          },
        },
      },
    },
    allFamiliars: {
      nodes: {
        id: true,
        name: true,
        image: true,
        itemByLarva: {
          id: true,
          name: true,
          image: true,
          quest: true,
          tradeable: true,
          discardable: true,
          descid: true,
          gift: true,
          itemModifierByItem: {
            modifiers: true,
          },
        },
        itemByEquipment: {
          id: true,
          name: true,
          image: true,
          quest: true,
          tradeable: true,
          discardable: true,
          descid: true,
          gift: true,
          itemModifierByItem: {
            modifiers: true,
          },
        },
        categories: true,
        attributes: true,
        familiarModifierByFamiliar: {
          modifiers: true,
        },
      },
    },
  });
