//
//  SessionView.swift
//  BeMeh
//
//  The live consult — a real Jitsi video meeting (see MeetingWebView.swift).
//  Jitsi provides the in-call UI (self-view, remote tiles, mute, camera flip);
//  we add a slim BeMeh top bar with the pro and a Leave button.
//

import SwiftUI

struct SessionView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    private var roomURL: URL {
        Meeting.roomURL(pro: state.upcoming.pro.name, displayName: state.clientFirstName)
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea()

            MeetingWebView(url: roomURL)
                .ignoresSafeArea()

            topBar
        }
        .preferredColorScheme(.dark)
    }

    private var topBar: some View {
        HStack(spacing: 10) {
            Monogram(letter: state.upcoming.pro.initial, size: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text("Live consult")
                    .font(.label(10))
                    .tracking(1.2)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.gold)
                Text(state.upcoming.pro.displayName)
                    .font(.label(15))
                    .foregroundStyle(Palette.ink)
            }
            Spacer()
            Button("Leave") {
                Haptic.soft()
                state.isInSession = false
                dismiss()
            }
            .buttonStyle(GoldButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Palette.ground.opacity(0.9))
    }
}

#Preview {
    SessionView().environmentObject(AppState())
}
