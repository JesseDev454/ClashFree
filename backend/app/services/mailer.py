class ConsoleMailer:
    def send(self, to: str, subject: str, body: str) -> None:
        print(f"[ClashFree mail] to={to} subject={subject}\n{body}", flush=True)


mailer = ConsoleMailer()
