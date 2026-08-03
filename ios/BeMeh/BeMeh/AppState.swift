//
//  AppState.swift
//  BeMeh
//
//  Everything is local mock data — this build is a walkthrough of the flow,
//  not a client for a live backend.
//

import Foundation
import SwiftUI

final class AppState: ObservableObject {
    @Published var tab: Tab = .today
    @Published var reading: ScanReading
    @Published var scanDue: Bool = true
    /// The consult currently on screen, if any. Setting it opens the call.
    @Published var activeMeeting: MeetingInfo?
    @Published var savedMap: Bool = false
    @Published var regimenSlot: RegimenSlot = .morning

    /// Open a live call for a booking with the given pro, in its own room.
    func openMeeting(proInitial: String, proDisplay: String, room: String) {
        activeMeeting = MeetingInfo(proInitial: proInitial, proDisplay: proDisplay, room: room)
    }

    // Onboarding: the app opens on the sign-up gate until an account is created.
    @Published var isSignedUp: Bool = false
    @Published var clientFirstName: String = "there"
    let pros: [Esthetician]
    let upcoming: Appointment
    let regimen: [RegimenStep]
    let sessionNotes: [SessionNote]

    init() {
        let renee = Esthetician(
            name: "Renée A.", credential: "LE",
            specialty: "Acne & barrier repair", years: 9,
            rating: 4.9, reviews: 212,
            nextSlot: "Tonight 7:30", minutes: 45, price: 85
        )
        let aisha = Esthetician(
            name: "Aisha D.", credential: "LE",
            specialty: "Hyperpigmentation · melanin-rich skin", years: 12,
            rating: 4.8, reviews: 341,
            nextSlot: "Thu 6:00", minutes: 30, price: 60
        )
        let joelle = Esthetician(
            name: "Joelle M.", credential: "LE",
            specialty: "Rosacea · sensitized skin", years: 6,
            rating: 5.0, reviews: 98,
            nextSlot: "Fri 11:15", minutes: 45, price: 85
        )

        pros = [renee, aisha, joelle]

        upcoming = Appointment(
            title: "Deep Cleanse Consult",
            pro: renee,
            startsInMinutes: 20,
            minutes: 45,
            price: 85,
            // Stable room for the sample appointment, so a second device can
            // join it directly at https://meet.jit.si/bemeh-renee-2f7k.
            room: "bemeh-renee-2f7k"
        )

        reading = ScanReading(
            index: 78,
            headline: "Barrier recovering",
            detail: "Redness down 11% since 14 Feb.",
            capturedOn: "14 Feb"
        )

        regimen = [
            RegimenStep(order: 1, product: "Cream cleanser",
                        instruction: "Lukewarm water, 30 seconds", slot: .morning),
            RegimenStep(order: 2, product: "Azelaic acid 10%",
                        instruction: "Jaw and chin only — Tue & Fri", slot: .morning),
            RegimenStep(order: 3, product: "Barrier cream",
                        instruction: "On damp skin, don't skip the neck", slot: .morning),
            RegimenStep(order: 4, product: "SPF 50",
                        instruction: "Two fingers, reapply at 2pm", slot: .morning),

            RegimenStep(order: 1, product: "Oil cleanse, then cream cleanse",
                        instruction: "Double cleanse on makeup days", slot: .evening),
            RegimenStep(order: 2, product: "Adapalene 0.1%",
                        instruction: "Pea-sized, whole face — Mon, Wed, Sat", slot: .evening),
            RegimenStep(order: 3, product: "Barrier cream",
                        instruction: "Buffer over the retinoid, generous", slot: .evening),

            RegimenStep(order: 1, product: "Enzyme mask",
                        instruction: "Sunday only, 8 minutes, rinse warm", slot: .weekly),
            RegimenStep(order: 2, product: "Pillowcase change",
                        instruction: "Twice weekly — friction is the jaw story", slot: .weekly)
        ]

        sessionNotes = [
            SessionNote(area: "Left jaw", note: "Congestion here is friction, not diet.",
                        x: 0.34, y: 0.36),
            SessionNote(area: "Right cheek", note: "Post-inflammatory mark, fading on schedule.",
                        x: 0.62, y: 0.44),
            SessionNote(area: "Chin", note: "Dropping actives to twice a week.",
                        x: 0.47, y: 0.58)
        ]
    }

    func completeScan() {
        scanDue = false
        reading = ScanReading(
            index: 81,
            headline: "Barrier holding",
            detail: "Redness down 14% since your last capture.",
            capturedOn: "today"
        )
    }
}
