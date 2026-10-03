import Svg, { G, Path } from "react-native-svg";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../lib/theme";

/**
 * The Neighbourhood mark.
 *
 * A house roof over a heart formed by two crossing strokes, with a woven
 * gap where they cross, and three dots beneath — one for each of the
 * three layers of the company (spaces, neighbours, guidance).
 *
 * The paths are the studio-approved artwork, copied verbatim from the
 * website's LogoIcon.jsx rather than redrawn, so the app and the site
 * render the identical mark. If the artwork ever changes, change it in
 * one place and re-copy — do not hand-edit these.
 *
 * The heart's weave is a second subpath cut out with fillRule="evenodd",
 * which is what makes the crossing read correctly on any background.
 */
export function LogoMark({
  size = 40,
  color = colors.warmTaupe,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size * (1778 / 1979)} viewBox="0 0 1979 1778" fill={color}>
      <Path d="M 977 121 L 968 123 L 957 129 L 882 184 L 778 263 L 555 429 L 548 433 L 469 493 L 90 775 L 75 790 L 69 803 L 69 815 L 74 825 L 81 831 L 95 837 L 112 837 L 128 830 L 142 821 L 301 709 L 330 685 L 480 575 L 962 215 L 974 208 L 983 207 L 996 212 L 1008 220 L 1072 269 L 1250 400 L 1825 829 L 1839 838 L 1857 845 L 1871 845 L 1880 841 L 1888 834 L 1893 827 L 1896 820 L 1896 809 L 1893 800 L 1884 787 L 1868 771 L 1835 745 L 1814 731 L 1761 690 L 1708 652 L 1211 282 L 1175 254 L 1143 232 L 1074 179 L 1032 149 L 1018 137 L 996 124 L 985 121 L 978 121 Z" />
      <Path fillRule="evenodd" d="M 326 764 L 325 765 L 305 767 L 300 770 L 294 776 L 291 781 L 287 796 L 287 822 L 288 823 L 288 848 L 289 849 L 289 875 L 290 876 L 290 901 L 291 902 L 295 1034 L 296 1035 L 296 1052 L 297 1053 L 300 1112 L 301 1113 L 304 1158 L 305 1159 L 307 1189 L 308 1190 L 308 1198 L 309 1199 L 309 1207 L 311 1217 L 311 1226 L 313 1234 L 314 1249 L 315 1250 L 320 1291 L 322 1298 L 322 1304 L 333 1362 L 339 1384 L 342 1401 L 356 1447 L 367 1475 L 380 1501 L 402 1534 L 428 1561 L 452 1578 L 470 1587 L 494 1595 L 510 1598 L 533 1599 L 534 1600 L 559 1599 L 560 1598 L 575 1597 L 603 1591 L 641 1579 L 671 1567 L 703 1552 L 726 1539 L 763 1514 L 793 1501 L 813 1490 L 858 1461 L 942 1402 L 955 1394 L 981 1375 L 990 1371 L 1000 1372 L 1008 1376 L 1033 1394 L 1064 1414 L 1102 1442 L 1181 1494 L 1225 1515 L 1275 1548 L 1293 1557 L 1347 1580 L 1371 1588 L 1382 1590 L 1394 1594 L 1409 1597 L 1415 1597 L 1416 1598 L 1433 1599 L 1434 1600 L 1460 1600 L 1461 1599 L 1470 1599 L 1471 1598 L 1482 1597 L 1507 1590 L 1535 1577 L 1557 1562 L 1581 1538 L 1599 1512 L 1605 1499 L 1615 1482 L 1625 1458 L 1629 1444 L 1632 1438 L 1632 1435 L 1640 1411 L 1643 1396 L 1645 1392 L 1662 1310 L 1662 1304 L 1663 1303 L 1665 1285 L 1669 1265 L 1670 1251 L 1671 1250 L 1675 1211 L 1676 1210 L 1676 1201 L 1677 1200 L 1677 1191 L 1678 1190 L 1678 1181 L 1679 1180 L 1679 1171 L 1680 1170 L 1680 1161 L 1681 1160 L 1681 1150 L 1682 1149 L 1686 1082 L 1687 1081 L 1687 1062 L 1688 1061 L 1689 1023 L 1690 1022 L 1690 999 L 1691 998 L 1692 931 L 1693 930 L 1693 916 L 1694 915 L 1696 843 L 1697 842 L 1697 796 L 1696 795 L 1696 790 L 1691 779 L 1681 769 L 1669 764 L 1654 764 L 1639 768 L 1635 771 L 1631 778 L 1629 785 L 1626 943 L 1625 944 L 1625 968 L 1624 969 L 1624 992 L 1623 993 L 1621 1048 L 1620 1049 L 1617 1105 L 1616 1106 L 1612 1160 L 1611 1161 L 1611 1169 L 1610 1170 L 1610 1178 L 1609 1179 L 1604 1229 L 1603 1230 L 1603 1236 L 1602 1237 L 1602 1243 L 1601 1244 L 1601 1250 L 1600 1251 L 1600 1257 L 1598 1264 L 1595 1288 L 1593 1294 L 1588 1325 L 1586 1330 L 1585 1339 L 1577 1372 L 1568 1400 L 1568 1403 L 1556 1436 L 1545 1460 L 1532 1482 L 1517 1500 L 1499 1514 L 1489 1519 L 1474 1524 L 1464 1525 L 1463 1526 L 1442 1527 L 1441 1526 L 1421 1525 L 1394 1519 L 1351 1504 L 1295 1477 L 1231 1440 L 1141 1381 L 1074 1334 L 1065 1326 L 1064 1317 L 1066 1311 L 1117 1263 L 1139 1239 L 1166 1205 L 1182 1181 L 1199 1151 L 1210 1127 L 1221 1096 L 1228 1060 L 1228 1025 L 1227 1024 L 1227 1017 L 1223 997 L 1216 977 L 1205 956 L 1191 937 L 1179 925 L 1158 910 L 1136 900 L 1113 895 L 1085 895 L 1066 899 L 1045 907 L 1023 920 L 998 940 L 990 942 L 981 937 L 959 918 L 936 905 L 919 899 L 906 896 L 875 895 L 874 896 L 866 896 L 861 898 L 857 898 L 841 903 L 819 914 L 800 929 L 785 947 L 776 962 L 768 979 L 759 1009 L 759 1014 L 757 1021 L 757 1032 L 756 1033 L 757 1064 L 763 1095 L 772 1122 L 790 1160 L 800 1177 L 822 1209 L 853 1247 L 898 1293 L 922 1315 L 922 1326 L 917 1332 L 903 1341 L 864 1370 L 808 1407 L 753 1442 L 692 1477 L 649 1498 L 599 1517 L 564 1525 L 547 1526 L 546 1527 L 532 1527 L 531 1526 L 515 1525 L 493 1518 L 484 1513 L 472 1504 L 460 1491 L 445 1469 L 430 1438 L 417 1401 L 417 1398 L 411 1380 L 403 1347 L 402 1338 L 400 1333 L 399 1323 L 392 1289 L 392 1284 L 391 1283 L 391 1277 L 390 1276 L 390 1270 L 389 1269 L 389 1263 L 388 1262 L 388 1256 L 385 1241 L 385 1234 L 383 1226 L 380 1190 L 379 1189 L 379 1181 L 377 1171 L 377 1160 L 376 1159 L 373 1113 L 372 1112 L 370 1069 L 369 1068 L 367 1014 L 366 1013 L 359 800 L 358 799 L 357 789 L 351 776 L 344 769 L 335 765 L 327 764 Z M 876 968 L 877 967 L 892 967 L 906 971 L 920 979 L 935 994 L 946 1011 L 961 1044 L 986 1120 L 989 1120 L 992 1118 L 995 1118 L 999 1120 L 1001 1118 L 1007 1091 L 1020 1053 L 1030 1028 L 1039 1010 L 1046 999 L 1055 988 L 1069 976 L 1080 970 L 1091 967 L 1107 967 L 1117 970 L 1126 975 L 1137 985 L 1146 998 L 1150 1007 L 1154 1021 L 1155 1038 L 1156 1039 L 1154 1064 L 1150 1081 L 1144 1098 L 1134 1118 L 1134 1120 L 1124 1138 L 1100 1173 L 1068 1210 L 1046 1232 L 1007 1266 L 995 1272 L 987 1271 L 975 1264 L 944 1237 L 912 1205 L 874 1159 L 856 1131 L 842 1102 L 835 1081 L 830 1055 L 830 1028 L 831 1027 L 832 1016 L 837 1001 L 847 985 L 861 973 L 867 970 L 875 968 Z" />
      <G>
        <Path d="M 800 1572 L 780 1577 L 767 1584 L 759 1590 L 750 1599 L 746 1605 L 742 1617 L 742 1623 L 741 1624 L 742 1637 L 744 1644 L 748 1653 L 756 1664 L 771 1676 L 777 1679 L 792 1683 L 806 1683 L 822 1678 L 837 1667 L 845 1658 L 851 1647 L 853 1638 L 853 1629 L 854 1628 L 851 1606 L 849 1600 L 845 1594 L 829 1579 L 818 1574 L 810 1572 L 801 1572 Z" />
        <Path d="M 985 1570 L 972 1574 L 962 1580 L 952 1590 L 948 1596 L 942 1612 L 942 1618 L 941 1619 L 942 1639 L 945 1649 L 951 1660 L 959 1669 L 966 1674 L 974 1678 L 985 1681 L 991 1681 L 992 1682 L 1008 1681 L 1022 1676 L 1030 1671 L 1043 1657 L 1048 1648 L 1052 1636 L 1052 1629 L 1053 1628 L 1052 1614 L 1047 1600 L 1041 1591 L 1029 1579 L 1021 1574 L 1012 1571 L 986 1570 Z" />
        <Path d="M 1169 1570 L 1160 1573 L 1145 1583 L 1135 1596 L 1131 1605 L 1128 1617 L 1128 1634 L 1130 1642 L 1134 1651 L 1140 1660 L 1149 1669 L 1159 1676 L 1167 1679 L 1182 1680 L 1183 1681 L 1208 1677 L 1214 1674 L 1226 1663 L 1232 1655 L 1237 1645 L 1240 1632 L 1240 1617 L 1237 1607 L 1232 1598 L 1224 1589 L 1204 1576 L 1187 1570 L 1170 1570 Z" />
      </G>
    </Svg>
  );
}

/**
 * Mark plus wordmark, stacked. For moments where the brand should
 * introduce itself — the welcome screen, the setup wait — rather than
 * merely be present.
 */
export function Logotype({
  size = 56,
  color = colors.warmTaupe,
  align = "center",
}: {
  size?: number;
  color?: string;
  align?: "center" | "flex-start";
}) {
  return (
    <View style={[styles.stack, { alignItems: align }]}>
      <LogoMark size={size} color={color} />
      <Text style={[styles.wordmark, { color: colors.charcoal }]}>The Neighbourhood</Text>
    </View>
  );
}

/**
 * Mark plus wordmark, side by side. The header-bar counterpart to
 * Logotype's stacked layout — a slim bar doesn't have the height to
 * spare for a stacked lockup, so this sits the two inline instead.
 */
export function LogoLockup({
  size = 30,
  color = colors.warmTaupe,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} color={color} />
      <Text style={[styles.wordmark, styles.rowWordmark, { color: colors.charcoal }]}>
        The Neighbourhood
      </Text>
    </View>
  );
}

/**
 * Mark plus a plain screen title, side by side -- the header-bar treatment
 * for every tab that isn't Home. Home keeps the full lockup (LogoLockup)
 * as its own distinct "arrival" moment; everywhere else just needs the
 * mark present, at a size clearly subordinate to Home's, so the brand
 * reads consistently without repeating the wordmark on every screen.
 */
export function HeaderTitleWithMark({
  title,
  textColor,
  markColor = colors.warmTaupe,
  weight = "bold",
}: {
  title: string;
  textColor: string;
  markColor?: string;
  weight?: "bold" | "semiBold";
}) {
  return (
    <View style={styles.titleRow}>
      <LogoMark size={19} color={markColor} />
      <Text
        style={[
          styles.titleText,
          { color: textColor, fontFamily: weight === "bold" ? fonts.bodyBold : fonts.bodySemiBold },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  wordmark: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowWordmark: {
    fontSize: 17,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleText: {
    fontSize: 17,
  },
});
