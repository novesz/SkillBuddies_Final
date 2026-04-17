-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: skillmegoszt
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `changes`
--

LOCK TABLES `changes` WRITE;
/*!40000 ALTER TABLE `changes` DISABLE KEYS */;
INSERT INTO `changes` VALUES (23,1,'Herr Paulus','$2b$10$Qv2DSY5zzxFvofoTamVKxO4jiEF8RPs/gBtlEr','palpal828@hengersor.hu',1,'2026-03-04 08:16:25'),(24,2,'Eszti Eszti','$2b$10$7XtZd6bDaORctPDsaNs9G.zl3Yz2GNcU/.LUts','novesz831@hengersor.hu',1,'2026-03-04 08:16:25'),(25,3,'Hubi Hubi','$2b$10$wLWTCxbt6hTKsYLj2OxPS.olO02GHilsul1aBf','szahub608@hengersor.hu',1,'2026-03-04 08:16:25');
/*!40000 ALTER TABLE `changes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `chats`
--

LOCK TABLES `chats` WRITE;
/*!40000 ALTER TABLE `chats` DISABLE KEYS */;
INSERT INTO `chats` VALUES (1,'AAAAAA','Cuncik',NULL,'2025-01-01 00:00:00',0),(2,'AAAAAB','NotPoopie',NULL,'2025-11-04 11:47:40',0),(5,'BSF4WS','Cuncik2',NULL,'2026-02-03 10:17:03',0),(6,'3KLUQM','Tanuljunk c#-et!',15,'2026-03-04 11:11:30',0),(7,'VYLB6R','Tanuljunk c++-t!',16,'2026-03-04 11:12:08',0),(8,'EY2ZL8','Deutsche Klasse',17,'2026-03-04 11:12:47',0),(9,'80KWEG','mégegy csoport',18,'2026-03-04 11:13:14',0);
/*!40000 ALTER TABLE `chats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `msgs`
--

LOCK TABLES `msgs` WRITE;
/*!40000 ALTER TABLE `msgs` DISABLE KEYS */;
INSERT INTO `msgs` VALUES (1,1,1,'ASDASD','2026-01-22 10:34:23'),(2,1,2,'ASDASD2','2026-01-22 10:34:23'),(3,2,1,'Pali ne','2026-01-22 10:34:23'),(4,2,1,'Hi everyone!','2026-03-01 09:00:00'),(5,3,1,'Hello!','2026-03-01 09:05:00'),(6,1,2,'Welcome to NotPoopie','2026-03-02 10:00:00'),(7,2,2,'Thanks!','2026-03-02 10:01:00'),(8,3,2,'Cool group','2026-03-02 10:02:00'),(9,1,6,'C# practice starts here','2026-03-04 11:15:00'),(10,2,6,'Ready to learn','2026-03-04 11:20:00'),(11,4,6,'Joined too','2026-03-05 08:00:00'),(12,5,6,'Admin here – any questions?','2026-03-05 08:05:00');
/*!40000 ALTER TABLE `msgs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `neededskills`
--

LOCK TABLES `neededskills` WRITE;
/*!40000 ALTER TABLE `neededskills` DISABLE KEYS */;
INSERT INTO `neededskills` VALUES (1,4),(1,6),(1,7),(1,9),(2,4),(2,5),(2,8),(6,11),(7,17),(8,4),(8,5),(8,6),(9,23);
/*!40000 ALTER TABLE `neededskills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `pictures`
--

LOCK TABLES `pictures` WRITE;
/*!40000 ALTER TABLE `pictures` DISABLE KEYS */;
INSERT INTO `pictures` VALUES (1,'BB.png'),(2,'BCpng'),(3,'BD.png'),(4,'GS.png'),(5,'OD.png'),(6,'PB.png'),(7,'PC.png'),(8,'RB.png'),(9,'RD.png'),(10,'YC.png'),(11,'YS.png'),(12,'Ant.png'),(13,'Bodi.png'),(14,'Szarvi.png'),(15,'/groupavatars/Ant.png'),(16,'/groupavatars/Szarvi.png'),(17,'/groupavatars/Szarvi.png'),(18,'/groupavatars/Bodi.png');
/*!40000 ALTER TABLE `pictures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,2,5,'Jó arc'),(2,3,2,'voltak gondok');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `skills`
--

LOCK TABLES `skills` WRITE;
/*!40000 ALTER TABLE `skills` DISABLE KEYS */;
INSERT INTO `skills` VALUES (27,'Bootstrap'),(11,'C#'),(17,'C++'),(23,'Crocheting'),(14,'CSS'),(20,'Drums'),(1,'English (A1-A2)'),(2,'English (B1-B2)'),(3,'English (C1-C2)'),(24,'Gardening'),(4,'German (A1-A2)'),(5,'German (B1-B2)'),(6,'German (C1-C2)'),(19,'Guitar'),(13,'HTML'),(7,'Hungarian grammar'),(9,'Hungarian history'),(8,'Hungarian literature'),(16,'Java'),(12,'JavaScript'),(25,'MySQL'),(18,'Piano'),(15,'Python'),(26,'React'),(22,'Singing / Vocal coach'),(21,'Violin'),(10,'Writing');
/*!40000 ALTER TABLE `skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
INSERT INTO `tickets` VALUES (2,'asd@asd.com','asdasd',0,'2026-03-04',NULL),(3,'demo@skillbuddies.test','Cannot reset password',0,'2026-03-05',NULL),(4,'member@skillbuddies.test','How do I join a group?',1,'2026-03-05','Use the Join by ID button with the code from the group.'),(5,'admin@skillbuddies.test','Bug: chat sometimes does not load',0,'2026-03-06',NULL);
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `uac`
--

LOCK TABLES `uac` WRITE;
/*!40000 ALTER TABLE `uac` DISABLE KEYS */;
INSERT INTO `uac` VALUES (1,1,1,'2026-01-22 10:33:28'),(1,2,0,'2026-01-22 10:33:28'),(1,6,1,'2026-03-04 11:11:30'),(1,7,1,'2026-03-04 11:12:08'),(1,8,1,'2026-03-04 11:12:47'),(1,9,1,'2026-03-04 11:13:14'),(2,1,1,'2026-01-22 10:33:28'),(2,2,1,'2026-01-22 10:33:28'),(3,1,0,'2026-01-22 10:33:28'),(3,2,1,'2026-01-22 10:33:28'),(4,1,0,'2026-03-05 08:00:00'),(4,6,0,'2026-03-05 08:00:00'),(5,2,1,'2026-03-05 08:00:00'),(5,6,1,'2026-03-05 08:00:00'),(6,2,0,'2026-03-05 09:00:00'),(6,6,0,'2026-03-05 09:00:00');
/*!40000 ALTER TABLE `uac` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `uas`
--

LOCK TABLES `uas` WRITE;
/*!40000 ALTER TABLE `uas` DISABLE KEYS */;
INSERT INTO `uas` VALUES (1,1),(1,2),(1,3),(1,4),(2,3),(2,4),(3,1),(3,2),(4,11),(4,15),(5,4),(5,5),(5,11),(6,11),(6,12);
/*!40000 ALTER TABLE `uas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `user_rank`
--

LOCK TABLES `user_rank` WRITE;
/*!40000 ALTER TABLE `user_rank` DISABLE KEYS */;
INSERT INTO `user_rank` VALUES (0,'banned'),(1,'user'),(2,'admin'),(3,'owner');
/*!40000 ALTER TABLE `user_rank` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Herr Paulus','$2b$10$Qv2DSY5zzxFvofoTamVKxO4jiEF8RPs/gBtlErwo.agFVXDURV24q','palpal828@hengersor.hu',1,0,3,NULL),(2,'Eszti Eszti','$2b$10$7XtZd6bDaORctPDsaNs9G.zl3Yz2GNcU/.LUts3jMwe9JmFERluTK','novesz831@hengersor.hu',2,0,3,NULL),(3,'Hubi Hubi','$2b$10$wLWTCxbt6hTKsYLj2OxPS.olO02GHilsul1aBfYC3qCgxoQDnslcm','szahub608@hengersor.hu',3,0,2,NULL),(4,'Demo User','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','demo@skillbuddies.test',1,0,1,NULL),(5,'Team Admin','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin@skillbuddies.test',1,0,2,NULL),(6,'Test Member','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','member@skillbuddies.test',1,0,1,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-04 11:14:31
