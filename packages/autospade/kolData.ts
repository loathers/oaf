export function getItemFromName(name: string) {
  switch (name) {
    case "seal-clubbing club":
      return {
        id: 1,
        name,
        type: "weapon",
      };
    case "disco ball":
      return {
        id: 10,
        name,
        type: "weapon",
      };
    case "dripping meat crossbow":
      return {
        id: 115,
        name,
        type: "weapon",
      };
  }
}
