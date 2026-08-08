//
//  TodayView.swift
//  BeMeh
//
//  One card that matters, one number that moves.
//

import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var state: AppState

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12:  return "Good morning"
        case 12..<17: return "Good afternoon"
        default:      return "Good evening"
        }
    }

    private var today: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, d MMMM"
        return f.string(from: Date())
    }

    var body: some View {
        ZStack {
            AtmosphereBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .center) {
                        ScreenHeader(eyebrow: today,
                                     title: "\(greeting),\n\(state.clientFirstName)")
                        Spacer()
                        Emblem(size: 72)
                    }
                    .padding(.bottom, 6)

                    nextAppointment
                    skinIndex
                    if state.scanDue { scanNudge }

                    Text("This build walks the flow with sample data. Nothing is sent anywhere.")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkDim)
                        .padding(.top, 6)
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
        }
    }

    private var nextAppointment: some View {
        Card(lifted: true) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Pill(text: "In \(state.upcoming.startsInMinutes) min", tone: .live)
                    Spacer()
                    Text("\(state.upcoming.minutes) min · $\(state.upcoming.price)")
                        .font(.data(11))
                        .foregroundStyle(Palette.inkDim)
                }

                HStack(spacing: 10) {
                    Monogram(letter: state.upcoming.pro.initial)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(state.upcoming.title)
                            .font(.label(15))
                            .foregroundStyle(Palette.ink)
                        Text("\(state.upcoming.pro.displayName) · barrier repair")
                            .font(.footnote)
                            .foregroundStyle(Palette.inkDim)
                    }
                }

                Button("Join session") {
                    Haptic.success()
                    state.openMeeting(proInitial: state.upcoming.pro.initial,
                                      proDisplay: state.upcoming.pro.displayName,
                                      room: state.upcoming.room)
                }
                .buttonStyle(GoldButtonStyle(wide: true))
            }
        }
    }

    private var skinIndex: some View {
        Card {
            HStack(spacing: 14) {
                RingGauge(value: state.reading.index)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Skin index").eyebrowStyle()
                    Text(state.reading.headline)
                        .font(.label(15))
                        .foregroundStyle(Palette.ink)
                    Text(state.reading.detail)
                        .font(.footnote)
                        .foregroundStyle(Palette.inkDim)
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var scanNudge: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Weekly scan due")
                        .font(.label(15))
                        .foregroundStyle(Palette.ink)
                    Text("About 40 seconds")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkDim)
                }
                Spacer()
                Button("Scan") { Haptic.tap(); state.tab = .scan }
                    .buttonStyle(GhostButtonStyle())
            }
        }
    }
}

struct TodayView_Previews: PreviewProvider {
    static var previews: some View { TodayView().environmentObject(AppState()) }
}
