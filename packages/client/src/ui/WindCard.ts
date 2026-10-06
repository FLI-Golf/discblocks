const CARDINALS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Course north is -Z, down the fairway toward the basket. */
function cardinalFrom(headingToward: number): string {
  const from = headingToward + Math.PI;
  const bearing = (radToDeg(Math.atan2(Math.sin(from), -Math.cos(from))) + 360) % 360;
  return CARDINALS[Math.round(bearing / 22.5) % 16];
}

export class WindCard {
  private root: HTMLElement;
  private arrow: HTMLElement;
  private readout: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'wind';

    const dial = document.createElement('div');
    dial.className = 'wind-dial';

    this.arrow = document.createElement('span');
    this.arrow.className = 'wind-arrow';
    dial.appendChild(this.arrow);

    const text = document.createElement('div');
    text.className = 'wind-text';

    const label = document.createElement('span');
    label.className = 'wind-label';
    label.textContent = 'Wind';

    this.readout = document.createElement('strong');

    text.append(label, this.readout);
    this.root.append(dial, text);
    container.appendChild(this.root);
  }

  update(headingToward: number, speedMph: number) {
    // The glyph points up at 0deg and CSS rotates clockwise, while "up" on the dial
    // is -Z, a heading of PI. Arrow shows where the wind blows to, label where from.
    this.arrow.style.transform = `rotate(${radToDeg(Math.PI - headingToward)}deg)`;
    this.readout.textContent = `${speedMph.toFixed(0)} mph ${cardinalFrom(headingToward)}`;
  }
}
