CREATE DATABASE  IF NOT EXISTS `bd_emoldurados` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `bd_emoldurados`;
-- MySQL dump 10.13  Distrib 8.0.36, for macos14 (x86_64)
--
-- Host: localhost    Database: bd_emoldurados
-- ------------------------------------------------------
-- Server version	8.0.42

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
-- Table structure for table `estruturas_reforco`
--

DROP TABLE IF EXISTS `estruturas_reforco`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estruturas_reforco` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_emoldurado` enum('canvas','matte') NOT NULL,
  `largura_min_cm` decimal(6,2) NOT NULL,
  `altura_min_cm` decimal(6,2) NOT NULL,
  `largura_max_cm` decimal(6,2) NOT NULL,
  `altura_max_cm` decimal(6,2) NOT NULL,
  `metragem_linear_reforco` decimal(8,2) NOT NULL,
  `observacoes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estruturas_reforco`
--

LOCK TABLES `estruturas_reforco` WRITE;
/*!40000 ALTER TABLE `estruturas_reforco` DISABLE KEYS */;
INSERT INTO `estruturas_reforco` VALUES (1,'canvas',0.00,0.00,26.00,66.50,205.40,'Estrutura simples com 4 sarrafos laterais (vertical + horizontal).'),(2,'matte',0.00,0.00,27.00,67.50,210.00,'Estrutura simples com 4 sarrafos laterais (vertical + horizontal).'),(3,'canvas',26.01,66.51,35.00,89.00,366.80,'Estrutura com travessa central horizontal (2 laterais + 2 horizontais + 1 central).'),(4,'matte',27.01,67.51,36.00,90.00,372.00,'Estrutura com travessa central horizontal (2 laterais + 2 horizontais + 1 central).'),(5,'canvas',35.01,89.01,46.00,92.00,394.00,'Estrutura com reforço central único e travessas de apoio.'),(6,'matte',36.01,90.01,47.00,93.00,398.00,'Estrutura com reforço central único e travessas de apoio.'),(7,'canvas',46.01,92.01,55.00,95.00,423.00,'Estrutura com 2 travessas centrais cruzadas.'),(8,'matte',47.01,93.01,56.00,96.00,428.00,'Estrutura com 2 travessas centrais cruzadas.'),(9,'canvas',55.01,95.01,61.00,98.00,452.00,'Estrutura com reforço interno e apoio duplo lateral.'),(10,'matte',56.01,96.01,62.00,99.00,456.00,'Estrutura com reforço interno e apoio duplo lateral.'),(11,'canvas',61.01,98.01,67.00,100.00,487.00,'Estrutura com travessas duplas + reforço vertical.'),(12,'matte',62.01,99.01,68.00,101.00,492.00,'Estrutura com travessas duplas + reforço vertical.'),(13,'canvas',67.01,100.01,75.00,102.00,515.00,'Estrutura reforçada com 3 sarrafos horizontais e travessa central.'),(14,'matte',68.01,101.01,76.00,103.00,519.00,'Estrutura reforçada com 3 sarrafos horizontais e travessa central.'),(15,'canvas',75.01,102.01,80.00,105.00,544.00,'Estrutura com reforço interno completo e travessas em X.'),(16,'matte',76.01,103.01,81.00,106.00,549.00,'Estrutura com reforço interno completo e travessas em X.'),(17,'canvas',80.01,105.01,85.00,108.00,572.00,'Estrutura com travessas laterais + diagonais.'),(18,'matte',81.01,106.01,86.00,109.00,576.00,'Estrutura com travessas laterais + diagonais.'),(19,'canvas',85.01,108.01,90.00,110.00,601.00,'Estrutura com cruzamento total interno (tipo escada).'),(20,'matte',86.01,109.01,91.00,111.00,605.00,'Estrutura com cruzamento total interno (tipo escada).'),(21,'canvas',90.01,110.01,100.00,120.00,638.00,'Estrutura máxima recomendada com reforço total e múltiplos apoios.'),(22,'matte',91.01,111.01,101.00,121.00,644.00,'Estrutura máxima recomendada com reforço total e múltiplos apoios.'),(23,'canvas',120.01,160.01,124.00,164.00,680.00,'Estrutura com reforço total interno e cruzamento reforçado (nível máximo)'),(24,'matte',120.01,160.01,124.00,164.00,680.00,'Estrutura com reforço total interno e cruzamento reforçado (nível máximo)'),(25,'canvas',124.01,164.01,128.00,168.00,715.00,'Estrutura com reforço total e travessas diagonais extras'),(26,'matte',124.01,164.01,128.00,168.00,715.00,'Estrutura com reforço total e travessas diagonais extras'),(27,'canvas',128.01,168.01,132.00,172.00,750.00,'Estrutura com reforço em X total e apoio periférico contínuo'),(28,'matte',128.01,168.01,132.00,172.00,750.00,'Estrutura com reforço em X total e apoio periférico contínuo'),(29,'canvas',132.01,172.01,140.00,180.00,800.00,'Estrutura reforçada para grandes formatos com suporte completo'),(30,'matte',132.01,172.01,140.00,180.00,800.00,'Estrutura reforçada para grandes formatos com suporte completo'),(31,'canvas',140.01,180.01,160.00,190.00,850.00,'Estrutura especial para formatos ampliados com reforço estrutural'),(32,'matte',140.01,180.01,160.00,190.00,850.00,'Estrutura especial para formatos ampliados com reforço estrutural'),(33,'canvas',160.01,190.01,200.00,200.00,900.00,'Estrutura máxima recomendada para molduras até 200 cm com reforço integral reforçado'),(34,'matte',160.01,190.01,200.00,200.00,900.00,'Estrutura máxima recomendada para molduras até 200 cm com reforço integral reforçado');
/*!40000 ALTER TABLE `estruturas_reforco` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-15 18:41:33
