//
//  RegimenView.swift
//  BeMeh
//
//  What she said, in the order you do it.
//

import SwiftUI

struct RegimenView: View {
    @EnvironmentObject private var state: AppState

    private var steps: [RegimenStep] {
        state.regimen.filter { $0.slot == state.regimenSlot }
    }

    var body: some View {
        ZStack {
            AtmosphereBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    ScreenHeader(eyebrow: "Prescribed 12 Mar by \(state.upcoming.pro.name)",
                                 title: "Your regimen")

                    Picker("Time of day", selection: $state.regimenSlot) {
                        ForEach(RegimenSlot.allCases) { slot in
                            Text(slot.rawValue).tag(slot)
                        }
                    }
                    .pickerStyle(.segmented)

                    VStack(spacing: 0) {
                        ForEach(Array(steps.enumerated()), id: \.element.id) { i, step in
                            stepRow(step)
                            if i < steps.count - 1 {
                                Divider().overlay(Palette.hairline)
                            }
                        }
                    }

                    restock
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
        }
    }

    private func stepRow(_ step: RegimenStep) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(String(format: "%02d", step.order))
                .font(.data(11))
                .foregroundStyle(Palette.inkDim)
                .padding(.top, 3)
            VStack(alignment: .leading, spacing: 2) {
                Text(step.product)
                    .font(.label(15))
                    .foregroundStyle(Palette.ink)
                Text(step.instruction)
                    .font(.footnote)
                    .foregroundStyle(Palette.inkDim)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 11)
    }

    private var restock: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Barrier cream: 9 days left")
                        .font(.label(15))
                        .foregroundStyle(Palette.ink)
                    Text("Based on your logged use")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkDim)
                }
                Spacer()
                Button("Reorder") { }
                    .buttonStyle(GoldButtonStyle())
            }
        }
    }
}

#Preview {
    RegimenView().environmentObject(AppState())
}
