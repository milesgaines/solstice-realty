//
//  SessionView.swift
//  BeMeh
//
//  The live consult — a real Jitsi video meeting (see MeetingWebView.swift),
//  in this booking's own private room. Jitsi provides the in-call UI; we add a
//  BeMeh top bar with the pro, the room code, a Copy-invite button, and Leave.
//

import SwiftUI
import UIKit

struct SessionView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    let meeting: MeetingInfo
    @State private var copied = false

    private var roomURL: URL {
        Meeting.roomURL(room: meeting.room, displayName: state.clientFirstName)
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
            Monogram(letter: meeting.proInitial, size: 34)

            VStack(alignment: .leading, spacing: 1) {
                Text("Live consult · private room")
                    .font(.label(10))
                    .tracking(1.0)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.gold)
                Text(meeting.proDisplay)
                    .font(.label(15))
                    .foregroundStyle(Palette.ink)
                Text(meeting.room)
                    .font(.data(11))
                    .foregroundStyle(Palette.inkDim)
            }

            Spacer()

            Button {
                UIPasteboard.general.string = Meeting.inviteLink(room: meeting.room).absoluteString
                Haptic.tap()
                withAnimation { copied = true }
            } label: {
                Image(systemName: copied ? "checkmark" : "square.and.arrow.up")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.gold)
                    .frame(width: 40, height: 40)
                    .overlay { Circle().strokeBorder(Palette.gold.opacity(0.5), lineWidth: 1) }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Copy invite link")

            Button("Leave") {
                Haptic.soft()
                state.activeMeeting = nil
                dismiss()
            }
            .buttonStyle(GoldButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Palette.ground.opacity(0.92))
    }
}

struct SessionView_Previews: PreviewProvider {
    static var previews: some View {
        SessionView(meeting: MeetingInfo(proInitial: "R", proDisplay: "Renée A., LE",
                                         room: "bemeh-demo-1234"))
            .environmentObject(AppState())
    }
}
