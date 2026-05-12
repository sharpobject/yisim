#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef int32_t HAuthTicket;
typedef uint64_t SteamAPICall_t;

typedef int (*SteamAPI_InitFn)(void);
typedef void (*SteamAPI_ShutdownFn)(void);
typedef void (*SteamAPI_RunCallbacksFn)(void);
typedef void *(*SteamAPI_SteamUser_v023Fn)(void);
typedef HAuthTicket (*SteamAPI_ISteamUser_GetAuthSessionTicketFn)(
    void *self,
    void *ticket,
    int ticket_max,
    uint32_t *ticket_size,
    void *identity_remote
);
typedef SteamAPICall_t (*SteamAPI_ISteamUser_RequestEncryptedAppTicketFn)(
    void *self,
    void *data,
    int data_size
);
typedef int (*SteamAPI_ISteamUser_GetEncryptedAppTicketFn)(
    void *self,
    void *ticket,
    int ticket_max,
    uint32_t *ticket_size
);

static const char base64_chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static void print_base64(const unsigned char *data, size_t len) {
    for (size_t i = 0; i < len; i += 3) {
        uint32_t value = data[i] << 16;
        if (i + 1 < len) value |= data[i + 1] << 8;
        if (i + 2 < len) value |= data[i + 2];

        putchar(base64_chars[(value >> 18) & 0x3f]);
        putchar(base64_chars[(value >> 12) & 0x3f]);
        putchar(i + 1 < len ? base64_chars[(value >> 6) & 0x3f] : '=');
        putchar(i + 2 < len ? base64_chars[value & 0x3f] : '=');
    }
    putchar('\n');
}

static void *must_symbol(void *handle, const char *name) {
    void *symbol = dlsym(handle, name);
    if (!symbol) {
        fprintf(stderr, "missing Steamworks symbol: %s\n", name);
        exit(2);
    }
    return symbol;
}

int main(int argc, char **argv) {
    const char *mode = "encrypted";
    const char *library_path = "YiXianPai/YiXianPai_Data/Plugins/libsteam_api.so";
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--auth-session") == 0) {
            mode = "auth-session";
        } else if (strcmp(argv[i], "--encrypted") == 0) {
            mode = "encrypted";
        } else {
            library_path = argv[i];
        }
    }

    void *handle = dlopen(library_path, RTLD_NOW | RTLD_LOCAL);
    if (!handle) {
        fprintf(stderr, "failed to load %s: %s\n", library_path, dlerror());
        return 2;
    }

    SteamAPI_InitFn SteamAPI_Init = must_symbol(handle, "SteamAPI_Init");
    SteamAPI_ShutdownFn SteamAPI_Shutdown = must_symbol(handle, "SteamAPI_Shutdown");
    SteamAPI_RunCallbacksFn SteamAPI_RunCallbacks = must_symbol(handle, "SteamAPI_RunCallbacks");
    SteamAPI_SteamUser_v023Fn SteamAPI_SteamUser_v023 =
        must_symbol(handle, "SteamAPI_SteamUser_v023");
    SteamAPI_ISteamUser_GetAuthSessionTicketFn GetAuthSessionTicket =
        must_symbol(handle, "SteamAPI_ISteamUser_GetAuthSessionTicket");
    SteamAPI_ISteamUser_RequestEncryptedAppTicketFn RequestEncryptedAppTicket =
        must_symbol(handle, "SteamAPI_ISteamUser_RequestEncryptedAppTicket");
    SteamAPI_ISteamUser_GetEncryptedAppTicketFn GetEncryptedAppTicket =
        must_symbol(handle, "SteamAPI_ISteamUser_GetEncryptedAppTicket");

    if (!SteamAPI_Init()) {
        fprintf(stderr, "SteamAPI_Init failed; Steam must be running and logged in for AppID 1948800.\n");
        return 1;
    }

    void *steam_user = SteamAPI_SteamUser_v023();
    if (!steam_user) {
        fprintf(stderr, "SteamAPI_SteamUser_v023 returned null.\n");
        SteamAPI_Shutdown();
        return 1;
    }

    unsigned char ticket[4096];
    uint32_t ticket_size = 0;
    if (strcmp(mode, "encrypted") == 0) {
        SteamAPICall_t call = RequestEncryptedAppTicket(steam_user, NULL, 0);
        if (call == 0) {
            fprintf(stderr, "RequestEncryptedAppTicket failed.\n");
            SteamAPI_Shutdown();
            return 1;
        }

        for (int i = 0; i < 100; i++) {
            SteamAPI_RunCallbacks();
            if (GetEncryptedAppTicket(steam_user, ticket, (int)sizeof(ticket), &ticket_size)) {
                print_base64(ticket, ticket_size);
                SteamAPI_Shutdown();
                return 0;
            }
            usleep(100000);
        }

        fprintf(stderr, "GetEncryptedAppTicket timed out or failed: call=%llu size=%u\n",
                (unsigned long long)call, ticket_size);
        SteamAPI_Shutdown();
        return 1;
    }

    HAuthTicket handle_ticket = GetAuthSessionTicket(
        steam_user,
        ticket,
        (int)sizeof(ticket),
        &ticket_size,
        NULL
    );

    for (int i = 0; i < 20; i++) {
        SteamAPI_RunCallbacks();
        usleep(50000);
    }

    if (handle_ticket == 0 || ticket_size == 0 || ticket_size > sizeof(ticket)) {
        fprintf(stderr, "GetAuthSessionTicket failed: handle=%d size=%u\n", handle_ticket, ticket_size);
        SteamAPI_Shutdown();
        return 1;
    }

    print_base64(ticket, ticket_size);
    SteamAPI_Shutdown();
    return 0;
}
