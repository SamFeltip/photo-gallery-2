export type PersonEventDetails = {
  personId: string;
  toggleMode: "active" | "disable";
};

export class PersonCustomEvent extends CustomEvent<PersonEventDetails> {
  constructor(personId: string, toggleMode: "active" | "disable") {
    super("person", { detail: { personId, toggleMode }, bubbles: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    person: PersonCustomEvent;
  }
}
