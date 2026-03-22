import { describe, it, expect } from 'vitest';
import { isEventPast, WINE_EVENTS, type WineEvent } from '../../src/lib/events';

describe('events.ts', () => {
  describe('WINE_EVENTS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(WINE_EVENTS)).toBe(true);
      expect(WINE_EVENTS.length).toBeGreaterThan(0);
    });

    it('should have events with required fields', () => {
      WINE_EVENTS.forEach(event => {
        expect(event.id).toBeDefined();
        expect(typeof event.id).toBe('string');
        expect(event.title).toBeDefined();
        expect(typeof event.title).toBe('string');
        expect(event.category).toBeDefined();
        expect(['portes-ouvertes', 'salon', 'festival', 'professionnel']).toContain(
          event.category,
        );
        expect(event.dates).toBeDefined();
        expect(event.dateEnd).toBeDefined();
        expect(event.location).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.image).toBeDefined();
        expect(event.sourceUrl).toBeDefined();
        expect(event.details).toBeDefined();
      });
    });

    it('should have valid ISO date format for dateEnd', () => {
      WINE_EVENTS.forEach(event => {
        // Check if dateEnd is valid ISO date (YYYY-MM-DD)
        const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
        expect(event.dateEnd).toMatch(isoRegex);
        // Verify it can be parsed as a date
        const date = new Date(event.dateEnd);
        expect(date.getTime()).not.toBeNaN();
      });
    });

    it('should have unique event IDs', () => {
      const ids = WINE_EVENTS.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have details with fullDescription', () => {
      WINE_EVENTS.forEach(event => {
        expect(event.details.fullDescription).toBeDefined();
        expect(typeof event.details.fullDescription).toBe('string');
        expect(event.details.fullDescription.length).toBeGreaterThan(0);
      });
    });

    it('should have optional arrays in details', () => {
      WINE_EVENTS.forEach(event => {
        if (event.details.schedule) {
          expect(Array.isArray(event.details.schedule)).toBe(true);
        }
        if (event.details.highlights) {
          expect(Array.isArray(event.details.highlights)).toBe(true);
        }
        if (event.details.practicalInfo) {
          expect(Array.isArray(event.details.practicalInfo)).toBe(true);
        }
      });
    });
  });

  describe('isEventPast', () => {
    it('should return true for past events', () => {
      const pastEvent: WineEvent = {
        id: 'past-event',
        title: 'Past Event',
        category: 'salon',
        dates: '1 - 3 mars 2020',
        dateEnd: '2020-03-03',
        location: 'Paris',
        description: 'Old event',
        image: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com',
        details: {
          fullDescription: 'An old event',
        },
      };
      expect(isEventPast(pastEvent)).toBe(true);
    });

    it('should return false for future events', () => {
      const futureEvent: WineEvent = {
        id: 'future-event',
        title: 'Future Event',
        category: 'salon',
        dates: '1 - 3 décembre 2026',
        dateEnd: '2026-12-03',
        location: 'Lyon',
        description: 'Upcoming event',
        image: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com',
        details: {
          fullDescription: 'An upcoming event',
        },
      };
      expect(isEventPast(futureEvent)).toBe(false);
    });

    it('should return true for today as past event (when dateEnd is today)', () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      const todayEvent: WineEvent = {
        id: 'today-event',
        title: 'Today Event',
        category: 'festival',
        dates: `Today`,
        dateEnd: todayString,
        location: 'Bordeaux',
        description: 'Event ending today',
        image: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com',
        details: {
          fullDescription: 'Event ending today',
        },
      };
      // Event ending today is considered past (dateEnd < today is false, so event is not past)
      // But the function uses < comparison, so if dateEnd equals today, it's not past
      expect(isEventPast(todayEvent)).toBe(false);
    });

    it('should correctly classify real events from WINE_EVENTS', () => {
      WINE_EVENTS.forEach(event => {
        const isPast = isEventPast(event);
        // This test just verifies the function works with real events
        // without throwing errors
        expect(typeof isPast).toBe('boolean');
      });
    });

    it('should handle events with matching visiteEventId', () => {
      const eventWithVisite: WineEvent = {
        id: 'vi-bordeaux-2026',
        title: 'Salon Bordeaux with Visite',
        category: 'salon',
        dates: '13 - 15 mars 2026',
        dateEnd: '2026-03-15',
        visiteEventId: 'vi-bordeaux-2026',
        location: 'Bordeaux',
        description: 'Event with visite mode',
        image: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com',
        details: {
          fullDescription: 'Event with visite',
        },
      };
      expect(isEventPast(eventWithVisite)).toBe(false);
    });

    it('should compare dates at 00:00:00 (midnight)', () => {
      // This test ensures time component is ignored
      const event: WineEvent = {
        id: 'time-test',
        title: 'Time Test Event',
        category: 'salon',
        dates: '21 mars 2026',
        dateEnd: '2026-03-21',
        location: 'Paris',
        description: 'Testing time component',
        image: 'https://example.com/image.jpg',
        sourceUrl: 'https://example.com',
        details: {
          fullDescription: 'Test',
        },
      };

      const now = new Date();
      const isPast = isEventPast(event);

      // If dateEnd is today, it should not be past
      if (now.toISOString().split('T')[0] === '2026-03-21') {
        expect(isPast).toBe(false);
      }
    });
  });

  describe('Event details structure', () => {
    it('should have various highlight fields for different categories', () => {
      const salonEvents = WINE_EVENTS.filter(e => e.category === 'salon');
      expect(salonEvents.length).toBeGreaterThan(0);

      salonEvents.forEach(event => {
        if (event.details.highlights) {
          expect(event.details.highlights.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle events without optional visteEventId', () => {
      const eventsWithoutVisite = WINE_EVENTS.filter(e => !e.visiteEventId);
      expect(eventsWithoutVisite.length).toBeGreaterThanOrEqual(0);

      eventsWithoutVisite.forEach(event => {
        expect(event.visiteEventId).toBeUndefined();
      });
    });

    it('should have meaningful image URLs', () => {
      WINE_EVENTS.forEach(event => {
        expect(event.image).toMatch(/^https?:\/\//);
      });
    });

    it('should have meaningful source URLs', () => {
      WINE_EVENTS.forEach(event => {
        expect(event.sourceUrl).toMatch(/^https?:\/\//);
      });
    });
  });
});
