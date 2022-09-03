---
title: "How to ensure all of Nix works on Apple silicon"
date: 2022-09-02
summary: "Make sure it builds under Rosetta"
link: ''
categories: []
draft: false
monetize: true
images:
- "/writing/2022-09-02-nix-rosetta-fix/images/holonix-compile.png"
---

{{< figure caption="Compiling Holochain on Holonix running in Rosetta." src="images/holonix-compile.png" link="images/holonix-compile.png">}}

## The Situation

When I first got my new M1 based computer, there were some time limitations on getting my dev environment set up. I was developing [a Holochain project using Holonix](https://github.com/lightningrodlabs/rea-playspace) (a Nix based environment) to get all of the required binaries set up. I timeboxed myself to a maximum of four hours, and ended up getting stuck when compiling the [Niv dependency manager for Nix](https://github.com/nmattia/niv). When I compiled it natively there was a filesystem cycle that Nix did not like and it would just abort (there may be a quick patch for the compiler that could fix this, but I haven't seen it).

I gave up after following a few different "How-to" guides that all ended it the same pain. I ended up installing the Holochain tools manually, which worked until Holochain 0.0.47, but I lost track of the dependencies after the upgrade to the version including Holochain Deterministic Integrity. So I bought an Intel based Mac to not lose more time.

As I recently learned from a new friend, there's a small detail which must be observed: the terminal emulator used to install Nix must be running in Rosetta when installing Nix.

Unfortunately, if you've already installed Nix natively, you need to remove it and reinstall it.

## Remove the existing Nix install

Either edit or restore the system shell rc files.

* Edit and remove the loader code from both zshrc and bashrc:
  ```
  ❯ sudo vim /etc/zshrc
  ❯ sudo vim /etc/bashrc
  ❯ sudo rm /etc/*.backup-before-nix
  ```
* If no other changes have been made to your rc files since installation, you may restore from backup:
  ```
  sudo mv /etc/zshrc.backup-before-nix /etc/zshrc
  sudo mv /etc/bashrc.backup-before-nix /etc/bashrc
  ```

Remove the disk from the fstab:
```
❯ sudo vifs
❯ cat /etc/synthetic.conf
nix
```

If there is only one item listed in `/etc/synthetic.conf`, then just `rm` it:

```
❯ sudo rm /etc/synthetic.conf
```

If there are more items, edit it and remove the line with `nix`:
```
❯ sudo vim /etc/synthetic.conf
```

Remove the services:
```
❯ sudo launchctl unload /Library/LaunchDaemons/org.nixos.nix-daemon.plist
❯ sudo rm /Library/LaunchDaemons/org.nixos.nix-daemon.plist
❯ sudo launchctl unload /Library/LaunchDaemons/org.nixos.darwin-store.plist
❯ sudo rm /Library/LaunchDaemons/org.nixos.darwin-store.plist
```

Clean up the Groups, Users, and Volume:
```
❯ sudo rm -rf /etc/nix /var/root/.nix-profile /var/root/.nix-defexpr /var/root/.nix-channels ~/.nix-profile ~/.nix-defexpr ~/.nix-channels
❯ sudo dscl . delete /Groups/nixbld
❯ for i in $(seq 1 32); do sudo dscl . -delete /Users/_nixbld$i; done
❯ sudo diskutil apfs deleteVolume /nix
Started APFS operation
Deleting APFS Volume from its APFS Container
Unmounting disk3s7
Erasing any xART session referenced by 59272A91-D4FE-4F12-B832-51E00C186075
Deleting Volume
Removing any Preboot and Recovery Directories
Finished APFS operation
```

## Restart

```
❯ sudo shutdown -r now
```

Then remove `/nix`:

```
❯ sudo rm -rf /nix/
```

## Make a copy of Terminal that runs under Rosetta

* In a finder window, navigate to the folder that contains Terminal.
* Control-click on Terminal and click `Duplicate`.
* Rename the duplicate app to `Terminal (Rosetta)`.
* Control-click and select `Get Info`.
* Under `General`, make sure `Open with Rosetta` is selected.

*Note*: This also works with iTerm or any other universal binary terminal emulator.

It's also possible to use the command line or script to run the shell without making a separate copy. See '[How can I run a command or script in rosetta from terminal on M1 Mac?](https://stackoverflow.com/questions/71065636/how-can-i-run-a-command-or-script-in-rosetta-from-terminal-on-m1-mac)'.

## Reinstall Nix in this new terminal

You can verify the architecture:
```
❯ arch
i386
```

Then follow the install instructions on the Nix install page again.

* [Nix: the package manager](https://nixos.org/download.html#nix-install-macos)

## Use Nix from any terminal

Once Nix is installed and bootstrapped, every executable it builds should be using the Intel architecture running on Rosetta. This means you can use any terminal you want. it doesn't need to be running on Rosetta.