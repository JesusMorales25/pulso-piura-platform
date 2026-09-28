const fallbackLabels: Record<string, string> = {
  NATURAL_GRASS: "Césped natural",
  SYNTHETIC_GRASS: "Césped sintético",
  HARD_COURT: "Superficie dura",
  CLAY: "Arcilla",
  WOOD: "Madera",
  LOCKER_ROOMS: "Vestuarios",
  SHOWERS: "Duchas",
  LED_LIGHTING: "Iluminación LED",
  PARKING: "Estacionamiento",
};

export function venueAttributeLabel(code: string, names: Map<string, string>) {
  return (
    names.get(code) ??
    fallbackLabels[code] ??
    code
      .toLocaleLowerCase("es-PE")
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("es-PE"))
  );
}
