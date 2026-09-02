# Freiwillige Post-Purchase-Frage

## Implementierter Sicherheitsvertrag

- Route: `/purchase/`, `noindex`, `nofollow`, `noarchive`, `no-referrer`.
- Frage: “Where did you first discover ANCBuddy?” mit festen Antworten und Skip.
- `shown`, `submitted` und `skipped` sind getrennte Site-Events.
- Download, Lizenz, Receipt und Kaufstatus sind niemals von der Antwort abhängig.
- Keine Namen, E-Mails, License Keys oder Freitexte.
- `order_identifier` wird nur als unvorhersehbares Bearer-Token zur Order-Prüfung
  verwendet, vor dem ersten Pageview aus der Browser-URL entfernt und nie in
  Event-Metadaten oder First-/Last-Touch-Pfade geschrieben.
- Die Antwortfunktion akzeptiert nur feste Quellen, begrenzte Bodies und erlaubte
  Origins; zusätzliche Felder wie `detail` werden mit HTTP 400 abgelehnt. Tabelle
  und Sprint-Views sind service-role-only.

Lokaler Browserbeleg: 9 feste Antworten, Submit-, Skip- und Invalid-Token-Pfad
bestanden; drei Site-Event-Requests enthielten keinen Order-Identifier. Live-Beleg:
ein garantiert nicht existierender UUID-Token antwortete aus Origin
`https://ancbuddy.com` mit HTTP 202/pending und erzeugte 0 Antwortzeilen.

## Freigabepunkt — Lemon Receipt/Confirmation

Erst nach Site-Deployment und einem lokalen/QA-Funktionstest:

1. Lemon-Dashboard → Produkt → Confirmation/Receipt-Einstellungen öffnen.
2. Optionale Button-/Redirect-URL auf
   `https://ancbuddy.com/purchase/?order_identifier=[order_identifier]` setzen.
3. Beschriftung neutral halten: `One optional question` oder `Help improve ANCBuddy`.
4. Download-/License-Aktionen unverändert lassen; die Frage darf nur ein zusätzlicher
   Link bzw. eine nachgelagerte Seite sein.
5. Zuerst im Lemon-Testmodus mit der markierten Testorder prüfen; erst danach eine
   separate Freigabe für Live-Konfiguration einholen.

Der Link-Variablenwert `[order_identifier]` stammt aus Lemon und ist laut Lemon für
Receipt-/Confirmation-Links vorgesehen. Keine Dashboard-Änderung wurde in diesem
Arbeitslauf vorgenommen.
