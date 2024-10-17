import { ChatInputCommandInteraction, codeBlock, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder().setName("vonnegut").setDescription("God dammit, babies!");

export function execute(interaction: ChatInputCommandInteraction) {
  return interaction.reply(codeBlock(`
  G O D   D A M M I T
         .
        .M  B A B I E S
       ,MM
       MM:
   .   YMM,
   M   'MMM,      ,
   M.   \`MMM:    .M
  MM,   ,MMMM   ,MMM
  "MM,  MMMMM' ,MMM'
  ,MMM.MMMMMMM.MMM:
  MMMMu/     \\uMMM
 "MMMM( () () )MM"
  ""MMM\\  ^  /MM"
   """M IIIII M"
     ""MmMmMmM"

Y O U ' V E  G O T   T O
    B E  K I N D ! ! !
`))
}