//
//  Models.swift
//  BeMeh
//

import Foundation

struct Esthetician: Identifiable, Hashable {
    let id: UUID = UUID()
    let name: String
    let credential: String
    let specialty: String
    let years: Int
    let rating: Double
    let reviews: Int
    let nextSlot: String
    let minutes: Int
    let price: Int

    var initial: String { String(name.prefix(1)) }
    var displayName: String { "\(name), \(credential)" }
}

struct Appointment: Identifiable {
    let id: UUID = UUID()
    let title: String
    let pro: Esthetician
    let startsInMinutes: Int
    let minutes: Int
    let price: Int
}

struct ScanReading {
    var index: Int
    var headline: String
    var detail: String
    var capturedOn: String
}

enum RegimenSlot: String, CaseIterable, Identifiable {
    case morning = "Morning"
    case evening = "Evening"
    case weekly  = "Weekly"

    var id: String { rawValue }
}

struct RegimenStep: Identifiable {
    let id: UUID = UUID()
    let order: Int
    let product: String
    let instruction: String
    let slot: RegimenSlot
}

struct SessionNote: Identifiable {
    let id: UUID = UUID()
    let area: String
    let note: String
    /// Position on the scan, in unit coordinates (0...1).
    let x: Double
    let y: Double
}

enum Tab: Hashable {
    case today, scan, book, regimen
}
