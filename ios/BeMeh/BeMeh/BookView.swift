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
    @State private var booked: Esthetician?

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
        .alert("Requested", isPresented: Binding(
            get: { booked != nil },
            set: { if !$0 { booked = nil } }
        )) {
            Button("OK", role: .cancel) { booked = nil }
        } message: {
            Text("\(booked?.displayName ?? "") will confirm your \(booked?.nextSlot ?? "") slot. Sample data — nothing was booked.")
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
                    Button("$\(pro.price)") { Haptic.success(); booked = pro }
                        .buttonStyle(GoldButtonStyle())
                }
            }
        }
    }
}

#Preview {
    BookView().environmentObject(AppState())
}
