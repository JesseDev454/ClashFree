import argparse

from app.core.database import get_session_factory
from app.services.academic_seed import seed_phase3
from app.services.seed import seed_phase2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    parser.add_argument("command", choices=["seed_phase2", "seed_phase3"])
    args = parser.parse_args(argv)
    session = get_session_factory()()
    try:
        if args.command == "seed_phase2":
            seed_phase2(session)
            print("Seeded Phase 2 departments and accounts.")
        elif args.command == "seed_phase3":
            seed_phase3(session)
            print("Seeded Phase 3 academic data.")
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
