Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

CI/CD i Hosting:
- Github Actions do tworzenia pipeline'ów CI/CD
- Cloudflare Pages jako hosting aplikacji Astro

Testing - Kompleksowa strategia testowania:

- Testy jednostkowe (Unit Tests):
  - Vitest jako główny framework testowy (zoptymalizowany dla Vite/Astro)
  - React Testing Library do testowania komponentów React
  - Skupienie na testowaniu izolowanych funkcji, hooków i serwisów
  - Pokrycie kodu testami na poziomie min. 90% dla kluczowej logiki biznesowej
  - Automatyczne uruchamianie testów w pipeline CI

- Testy komponentowe (Component Tests):
  - Vitest + React Testing Library
  - Testowanie renderowania, stanu i interakcji użytkownika
  - Izolowane testy dla pojedynczych komponentów (np. `LoginForm`, `FlashcardsTable`)
  - Mocki zewnętrznych zależności dla testów deterministycznych

- Testy integracyjne (Integration Tests):
  - Vitest do testowania endpointów API i ich interakcji z serwisami
  - Dedykowana testowa instancja bazy danych Supabase
  - Testowanie integracji z mockami API LLM
  - Weryfikacja przepływu danych między frontend-backend

- Środowisko testowe:
  - Dedykowana, odizolowana instancja bazy danych Supabase
  - Automatyczne uruchamianie testów w GitHub Actions
  - Smoke testy po wdrożeniu na produkcję
  - Testy regresji uruchamiane regularnie przed każdym wydaniem