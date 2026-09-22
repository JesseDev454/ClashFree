import httpx

from app.core.config import get_settings


class ConsoleMailer:
    def send(self, to: str, subject: str, body: str) -> None:
        print(f"[ClashFree mail] to={to} subject={subject}\n{body}", flush=True)


class ResendMailer:
    def __init__(self, api_key: str, sender: str) -> None:
        self.api_key = api_key
        self.sender = sender

    def send(self, to: str, subject: str, body: str) -> None:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "from": self.sender,
                "to": [to],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )
        response.raise_for_status()


def get_mailer() -> ConsoleMailer | ResendMailer:
    settings = get_settings()
    if settings.resend_api_key and settings.resend_from:
        return ResendMailer(settings.resend_api_key, settings.resend_from)
    return ConsoleMailer()
