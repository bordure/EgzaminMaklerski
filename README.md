# Egzamin Maklerski – Symulator Egzaminu

Przez brak darmowych źródeł do nauki na Egzamin Maklerski postanowiłem stworzyć stronę, dzięki której będzie można łatwo przygotować się dobrze do EM.

Strona umożliwia:
- rozwiązywanie **poprzednich testów z egzaminu maklerskiego**,  
- odpowiadanie na pytania podzielone na **poszczególne kategorie egzaminacyjne** (np. *Prawo*, *Matematyka Finansowa*),  
- generowanie egzaminów próbnych w trybie **nauki** lub **egzaminu** z timerem i oceną punktową.  

Projekt składa się z **trzech części**:  
1. **Frontend (React + Vite.js)** – aplikacja webowa dla użytkownika,  
2. **Backend (FastAPI + Python + MongoDB)** – API obsługujące pytania, egzaminy i statystyki,  
3. **Scraper (Python + BeautifulSoup4)** – narzędzie do automatycznego pobierania i aktualizacji pytań z KNF.

---

## Funkcje projektu

- **Przeglądanie pytań według kategorii egzaminacyjnych** (np. Prawo, Matematyka Finansowa).  
- **Generowanie egzaminów próbnych** z wybraną liczbą pytań.  
- **Tryb nauki lub tryb egzaminu** z odliczaniem czasu.  
- **Automatyczna punktacja** – +2 za poprawną odpowiedź, -1 za błędną, 0 za ominięcie. 
- **Import pytań** przy użyciu scrapera.  

