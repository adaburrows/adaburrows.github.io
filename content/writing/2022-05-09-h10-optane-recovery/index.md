---
title: "Recovering files off an H10 Optane w/ NAND SSD Module"
date: 2022-05-09
summary: "Don't give up, it's possible unless something went very wrong."
link: ''
categories: []
draft: false
monetize: true
images:
 - "/writing/2022-05-09-h10-optane-recovery/images/hexeditor.png"
---

{{< figure caption="Opening the disk image in `hexedit`." src="images/hexeditor.png" link="images/hexeditor.png">}}

## Intro

A few weeks ago, my year and a half old Dell Inspiron 2-in-1 laptop decided to just stop working. I came back from the kitchen, where I made some tea, but my screen was blank and the computer was unresponsive. I tried turning it off and on again, but all I got was a keyboard blinking every 5 or 3 seconds and the charging LED blinking white once every 7 seconds. I couldn't find anything to help me diagnose what was going wrong, but it seemed like it was a logic board failure.

I still had files on the computer I wanted off. I had been putting off sorting thorugh duplicate files and merging my old organization system with my new one, but it turns out, that is not a good reason to not make a back-up. Fortunately, I know enough about the low-level details of what I found to figure out how to get my files off.

To start, I bought two external M.2 NVME SSD drive enclosures and a new 2 TB SSD. I needed to create a backup disk image. I also needed space to put the files I wanted saved after I successfully retreived them. I also needed a live distro of Linux to use. I just so happened to use Kali Linux, but there's plenty of live distros to choose from.

## Inspect the drive

Make the image of the drive:

```
dd if=/sdc of=/media/kali/F7FD-F507/disk0.img # physical block sizes are typically 512KB, which is the default.
```

Next, we can see how the disk looks to various utils:

```
gparted /media/kali/F7FD-F507/disk0.img
```

{{< figure src="images/gparted.png">}}

Hmm, I didn't have a raid configured.

```
blkid /media/kali/F7FD-F507/disk0.img
```

{{< figure src="images/blkid.png">}}

Really? This must have something to do with the H10 Optane's setup. It must be using the Intel RAID controller in the BIOS to split the four channels into two each between the Optane portion and the 3D NAND portion of the module. Let's see what the original disk looks like in `dmraid` (because I couldn't see how to do this with the disk image file):

```
sudo dmraid -ay # this should find it and if it's valid it'll load it
```

{{< figure src="images/dmraid.png">}}

That's not good. Let's see what else we can get out of this by ignoring the RAID superblock:

```
blkid --probe --usages noraid /media/kali/F7FD-F507/disk0.img
```

{{< figure src="images/blkid-noraid.png">}}

Protective MBR, eh? Well, that doesn't tell us much. Perhaps TestDisk will help us more?

{{< figure src="images/TestDiskIntel.png">}}

No, none of that looks right. Looks like we're going to have to look at this in a hex editor! Let's open up hexedit, but let's also be careful not to edit it:

```
hexedit /media/kali/F7FD-F507/disk0.img
```

Alright, now we're getting somewhere. This looks like a GPT style drive with some issues. Let's decode this hexadecimal data and see what is happening. Immediately, we can see it's missing the first GPT header that should say "EFI PART", but it's not missing the first volume table. Here's the data prefixed by the offset in hexadecimal:

* `0x0` -- `0x200` -- Protective MBR (this is ignored)
    * `0x1BE` -- `0x00` (non-bootable)
    * `0x1BF` -- `0x000200` (begin second sector)
    * `0x1C2` -- `0xEE` (GPT partition)
    * `0x1C3` -- `0xFEBFD6`
        * `0b11111110 10 111111 11010110` =>
        * `0b11111110` (Head: 254) `0b111111` (Sector: 63) `0b1011010110` (Cyclinder: 726)
        * (((726 * 255) + 254) * 63) + 63 = 11679255 sectors, 5.9 GB, 5.56 GiB
    * `0x1C6` -- `0x01000000` (Preceeded by one relative sector, this one)
    * `0x1CA` -- `0xFFFFFFF` (Ending sector, 2.2 TB, 1.99 TiB)
    * `0x1FE` -- `0x55AA` (MBR Magic)
* EFI PART?
    * `0x200` -- _Where ye be?_ Coming up all zeroes.
* Partition Table
    * `0x400` -- `0x480`
        * C12A7328-F81F-11D2-BA4B-00A0C93EC93B -- [EFI System Partition](https://en.wikipedia.org/wiki/EFI_system_partition) -- ESP
            * `0x28732AC11FF8D211BA4B00A0C93EC93B`
        * `0x410` GUID: `0xBEB0DC7C3ECD4942988EC41374820D63`
        * `0x420` Starting LBA: `0x0008` -- offset `0x8000`*`0x200` = `0x1000000`
        * `0x428` Ending LBA: `0xFFB704` -- offset `0x4B7FF`*`0x200` = `0x96FFE00`
        * `0x438` Label: `EFI system partition`
    * `0x480` -- `0x500`
        * E3C9E316-0B5C-4DB8-817D-F92DF00215AE -- [Microsoft Reserved Partition](https://en.wikipedia.org/wiki/Microsoft_Reserved_Partition) -- MSP
            * `0x16E3C9E35C0BB84D817DF92DF00215AE`
        * `0x490` GUID: `0xA614A3694E39B94DAB59F5E477613D8C`
        * `0x4A0` Starting LBA: `0x00B804` -- offset `0x4B800` * `0x200` = `0x9700000`
        * `0x4A8` Ending LBA: `0xFFB708` -- offset `0x8B7FF` * `0x200` = `0x116FFE00`
        * `0x4B8` Label: `Microsoft reserved partition`
    * `0x500` -- `0x580`
        * EBD0A0A2-B9E5-4433-87C0-68B6B72699C7 -- [Basic Data Partition](https://en.wikipedia.org/wiki/Microsoft_basic_data_partition) -- BDP
            * `0xA2A0D0EBE5B9334487C068B6B72699C7`
        * `0x510` GUID: `0x6B28C785D0CEBC4CAC54A65CDC5DFF29`
            * 85C7286B-CED0-4CBC-AC54-A65CDC5DFF29
        * `0x520` Starting LBA: `0x00B808` -- offset `0x8B800` * `0x200` = `0x11700000`
        * `0x528` Ending LBA: `0xFF7F6739` -- offset `0x39677FFF` * `0x200` = `0x72CEFFFE00` (this tracks with the size I know the volume to be)
        * `0x538` Label: `Basic data partition`
    * `0x580` -- `0x600` 
        * DE94BBA4-06D1-4D40-A16A-BFD50179D6AC -- [Windows Recovery Environment](https://en.wikipedia.org/wiki/Windows_Preinstallation_Environment#Windows_Recovery_Environment)
            * `0xA4BB94DED106404DA16ABFD50179D6AC`
        * `0x590` GUID: `0x065030C5029ED247A509427B34214010`
            * C5305006-9E02-47D2-A509-427B34214010
        * `0x5A0` Starting LBA: `0x00806739` -- offset `0x39678000` * `0x200` = `0x72CF000000`
        * `0x5A8` Ending LBA: `0xFF6F8639` -- offset `0x39866FFF` * `0x200` = `0x730CDFFE00`
    * `0x600` -- `0x680`
        * DE94BBA4-06D1-4D40-A16A-BFD50179D6AC -- [Windows Recovery Environment](https://en.wikipedia.org/wiki/Windows_Preinstallation_Environment#Windows_Recovery_Environment)
            * `0xA4BB94DED106404DA16ABFD50179D6AC`
        * `0x610` GUID: `0xFE7A7B4441DE2246ABEBD01A11A66F4B`
            * 447B7AFE-DE41-4622-ABEB-D01A11A66F4B
        * `0x620` Starting LBA: `0x00708639` -- offset `0x39867000` * `0x200` = `0x730CE00000`
        * `0x628` Ending LBA: `0xFF97723B` -- offset `0x3B7297FF` * `0x200` = `0x76E52FFE00`
    * `0x680` -- `0x700`
        * DE94BBA4-06D1-4D40-A16A-BFD50179D6AC -- [Windows Recovery Environment](https://en.wikipedia.org/wiki/Windows_Preinstallation_Environment#Windows_Recovery_Environment)
            * `0xA4BB94DED106404DA16ABFD50179D6AC`
        * `0x690` GUID: `0x0D29D810B3D56D4092ED3F3B29FC2A7F`
            * 10D8290D-D5B3-406D-92ED-3F3B29FC2A7F
        * `0x6A0` Starting LBA: `0x00A0723B` = `0x3B72A000` * `0x200` = `0x76E5400000`
        * `0x6A8` Ending LBA: `0xFFA79D3B` = `0x3B9DA7FF` * `0x200` = `0x773B4FFE00`
* `0x773C019E00` -- `0x773C01A0AC` -- backup volume array (this matches the array above, but I've abbreviated it by partition type)
    * `0x773C019E00` -- `0x773C019E80` -- ESP
    * `0x773C019E80` -- `0x773C019F00` -- MSP
    * `0x773C019F00` -- `0x773C019F80` -- BDP
    * `0x773C019F80` -- `0x773C01A000` -- Recovery
    * `0x773C01A000` -- `0x773C01A080` -- Recovery
    * `0x773C01A080` -- `0x773C01A100` -- Recovery
* `0x773C01DE00` -- `0x773C01E000` -- GPT Header (enitre raw data below w/o offset)
    * `0x4546492050415254` // `EFI PART`
    * `0x00000100` // Revision
    * `0x5C000000` // GPT header size
    * `0x14CC2471` // CRC32 of header (zeroed for calculation)
    * `0x00000000` // Reserved (zeroes)
    * `0xEF009E3B00000000`
        * Current LBA: `0x3B9E00EF` * `0x200` = offset `0x773C01DE00`
    * `0x0100000000000000`
        * Backup/original LBA: `0x1` * `0x200` = offset `0x200` (welp, that is missing)
    * `0x2200000000000000`
        * First Usable LBA: `0x22` * `0x200` = offset `0x4400`
    * `0xCE009E3B00000000`
        * Last usable LBA: `0x3B9E00CE` * `0x200` = offset `0x773C019C00`
    * `0x2E85CB8C6AEB8B4D8635A53B968A0197`
        * GUID: 8CCB852E-EB6A-4D8B-8635-A53B968A0197
    * `0xCF009E3B00000000`
        * Starting LBA of array of entries: `0x3B9E00CF` * `0x200` = offset `0x773C019E00` (which checks out with the backup table)
    * `0x80000000`
        * Number of partition entries in array
    * `0x80000000`
        * Size of a partition entry
    * `0x94580226`
        * CRC32 of entries
* `0x773C01E000` -- `0x773C01E196` -- `VolPort` (?)
* `0x773C241E00` -- `0x773C242000` -- `Intel Raid ISM Error Log Sig` (?)
* `0x773C242000` -- `0x773C243000` -- Lots of `0xFFFFFF00` followed by `0x265ABD5FDE57D801` -- Test data? There's some of this before this, too.
* `0x773C255C00` -- `0x773C256000` -- `Intel Raid ISM Cfg Sig. `

## Retrieving the data

Now that we've decoded all the relevant records and partition tables, verified our partitions look right, and they are on the disk where the backup partition table says the should be, we can copy off the partition we want:

```
dd if=/media/kali/F7FD-F507/disk0.img of=/media/kali/F7FD-F507/bitlocker.dd bs=512 skip=571392 count=962512895
blkid /media/kali/F7FD-F507/bitlocker.dd
```

{{< figure src="images/blkid-bitlocker.png">}}

That looks right. It's detecting a bitlocker partition. Next, we can use `dislocker` to decrypt the disk using the recovery key and check to make sure it worked and there's an NTFS volume:

```
sudo mkdir -p /media/bitlocker/disk
sudo dislocker -V /media/kali/F7FD-F507/bitlocker.dd -p -- -o allow_other /media/bitlocker/disk
blkid /media/bitlocker/disk/dislocker-file
```

{{< figure src="images/blkid-ntfs.png">}}

That also looks correct. Let's go ahead and mount this NTFS volume:

```
udisksctl loop-setup -f /media/bitlocker/disk/dislocker-file
udisksctl mount -b /dev/loop1
```

Then lets check to see if the files are there:

```
ll /media/kali/OS/Users/jill/
```

{{< figure src="images/files.png">}}

This is looking great! Now let's copy over the files to our backup disk:

```
# Copy the files
cp -ar /media/kali/OS/Users/jill /media/kali/F7FD-F507/
# Copy the WSL subsystem image
cp -ar /media/kali/OS/Users/jill/AppData/Local/Packages/CanonicalGroupLimited.UbuntuonWindows_79rhkp1fndgsc/LocalState/ext4.vhdx /media/kali/F&FD-F507/
# Cleanup
udisksctl unmount -b /dev/loop1
udisksctl loop-delete -b /dev/loop1
sudo umount /media/bitlocker/disk
```

If there are some files in the Windows Subsystem for Linux that we want to backup, we can get those files off the container image located somewhere under `/Users/jill/AppData/Local/Packages/*/LocalState/*.vmdx`:

```
# Let's get the files off the vhdx image
sudo apt-get install libguestfs-tools
sudo mkdir /media/vhdx
sudo guestmount --add /media/kali/F7FD-F507/OS/Users/jill/AppData/Local/Packages/CanonicalGroupLimited.UbuntuonWindows_79rhkp1fndgsc/LocalState/ext4.vhdx -i --ro /media/vhdx
sudo cp -ar /media/vhdx/home/adaburrows/workspace /media/kali/F7FD-F507/
sudo guestunmount /media/vhdx
```

Success! Thankfully no parts of the partition had been mangled during the logic circuit malfunction. I'm sure there's other ways this could have failed which would make it much harder to ge the data off the chip on the SSD board.

## Possibilities

If there's demand for this sort of thing, I could write a program that takes care of fixing up a disk (or disk image) like this. The basic steps it would go through are:
* Check for the isw_raid_member using libblkid.
* Check for the structure of the with MBR and GPT partition tables (maybe see if there's any useful info in the newer isw metadata).
* If one of the GPT partition tables is present and correct (seems to match what is on the disk),
  * then write the correct GPT header and partition tables,
  * else scan the disk and try to determine the correct partition table and the write the correct headers and partition tables. 
* Remove the isw_raid_member sector.
* Remove the protective MBR partition that prevents the computer from booting off the disk.

That should be enough to get a non-damaged disk up a running again. For my purposes, I just needed this data and not a fully working disk.

## Further Reading

* [Microsoft Staff. (2021) Disk Devices and Partitions. Windows App Development. Microsoft Docs.](https://docs.microsoft.com/en-us/windows/win32/fileio/disk-devices-and-partitions)
* [Microsoft Staff. (2021) Basic and Dynamic Disks. Windows App Development. Microsoft Docs.](https://docs.microsoft.com/en-us/windows/win32/fileio/basic-and-dynamic-disks)
* [Microsoft Staff. (2009) How Basic Disks and Volumes Work. Windows Server 2003. Microsoft Docs.](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc739412(v=ws.10)?redirectedfrom=MSDN)
* [Microsoft Staff. (2009) How Dynamic Disks and Volumes Work. Windows Server 2003. Microsoft Docs.](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc758035(v=ws.10))
* [Wikipedia. GUID Partition Table](https://en.wikipedia.org/wiki/GUID_Partition_Table)
* [Sedory, Daniel. B. (2021) An Examination of The Microsoft® Windows™ 7, 8 and 10 GPT 'Protective' MBR and EFI Partitions. The Starman's Realm.](https://thestarman.pcministry.com/asm/mbr/GPT.htm)
* [Sedory, Daniel. B. (2013) Decoding CHS Values. MBR/EBR Partition Tables. The Starman's Realm.](https://thestarman.pcministry.com/asm/mbr/PartTables.htm#Decoding)
* [libblkid. util-linux. Github.](https://github.com/util-linux/util-linux/blob/master/libblkid/src/superblocks/isw_raid.c)
* [Metz, Joachim. (2022) BitLocker Drive Encryption (BDE) format specification. libbde. Github.](https://github.com/libyal/libbde/blob/main/documentation/BitLocker%20Drive%20Encryption%20(BDE)%20format.asciidoc)
* [What is the difference between seek and skip in dd command](https://unix.stackexchange.com/questions/307186/what-is-the-difference-between-seek-and-skip-in-dd-command) &mdash; In case `dd`'s skip and seek options confuse you, this is a great example.
