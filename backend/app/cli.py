import argparse

from app.core.database import get_session_factory
from app.services.academic_seed import seed_phase3
from app.services.constraints_seed import seed_phase4
from app.services.disruption_seed import seed_phase7
from app.services.publish_seed import seed_phase6
from app.services.seed import seed_phase2
from app.services.timetable_seed import seed_phase5


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    parser.add_argument(
        "command",
        choices=[
            "seed_phase2",
            "seed_phase3",
            "seed_phase4",
            "seed_phase5",
            "seed_phase6",
            "seed_phase7",
        ],
    )
    args = parser.parse_args(argv)
    session = get_session_factory()()
    try:
        if args.command == "seed_phase2":
            seed_phase2(session)
            print("Seeded Phase 2 departments and accounts.")
        elif args.command == "seed_phase3":
            seed_phase3(session)
            print("Seeded Phase 3 academic data.")
        elif args.command == "seed_phase4":
            seed_phase4(session)
            print("Seeded Phase 4 constraints and availability.")
        elif args.command == "seed_phase5":
            seed_phase5(session)
            print("Seeded Phase 5 solver catalogue tweaks.")
        elif args.command == "seed_phase6":
            seed_phase6(session)
            print("Seeded Phase 6 publish catalogue.")
        elif args.command == "seed_phase7":
            seed_phase7(session)
            print("Seeded Phase 7 disruption catalogue.")
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
