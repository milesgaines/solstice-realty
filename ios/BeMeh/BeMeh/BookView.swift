//
//  BookView.swift
//  BeMeh
//
//  Sorted by concern, not by who paid for placement.
//

import SwiftUI

struct BookView: View {
    @EnvironmentObject private var state: AppState
    @State private var filter = "Acne"
    @State private var pendingBooking: MeetingInfo?

    private let filters = ["Acne", "Pigment", "Rosacea", "Anti-aging"]

    var body: some View {
        ZStack {
            AtmosphereBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    ScreenHeader(eyebrow: "Licensed · verified · in your state",
                                 title: "Book a pro")

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(filters, id: \.self) { f in
                                Button {
                                    filter = f
                                } label: {
                                    Pill(text: f, tone: filter == f ? .selected : .neutral)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 2)
                    }

                    ForEach(state.pros) { pro in
                        proCard(pro)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
        }
        .alert("You're booked", isPresented: Binding(
            get: { pendingBooking != nil },
            set: { if !$0 { pendingBooking = nil } }
        )) {
            Button("Join now") {
                if let b = pendingBooking { state.activeMeeting = b }
                pendingBooking = nil
            }
            Button("Later", role: .cancel) { pendingBooking = nil }
        } message: {
            Text("Private room \(pendingBooking?.room ?? "") with \(pendingBooking?.proDisplay ?? ""). Share the invite link from inside the call so they join this exact room.")
        }
    }

    private func proCard(_ pro: Esthetician) -> some View {
        Card(lifted: pro.id == state.pros.first?.id) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Monogram(letter: pro.initial)
                    VStack(alignment: .leading, spacing: 1) {
                        HStack {
                            Text(pro.displayName)
                                .font(.label(15))
                                .foregroundStyle(Palette.ink)
                            Spacer()
                            Text("★ \(pro.rating, specifier: "%.1f")")
                                .font(.data(11))
                                .foregroundStyle(Palette.inkDim)
                        }
                        Text("\(pro.specialty) · \(pro.years) yrs")
                            .font(.footnote)
                            .foregroundStyle(Palette.inkDim)
                    }
                }

                HStack {
                    Text("\(pro.nextSlot) · \(pro.minutes) min")
                        .font(.data(11))
                        .foregroundStyle(Palette.inkDim)
                    Spacer()
                    Button("$\(pro.price) · Book") {
                        Haptic.success()
                        pendingBooking = MeetingInfo(proInitial: pro.initial,
                                                     proDisplay: pro.displayName,
                                                     room: RoomCode.make())
                    }
                    .buttonStyle(GoldButtonStyle())
                }
            }
        }
    }
}

#Preview {
    BookView().environmentObject(AppState())
}
