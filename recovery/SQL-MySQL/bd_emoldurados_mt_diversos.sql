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
-- Table structure for table `mt_diversos`
--

DROP TABLE IF EXISTS `mt_diversos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mt_diversos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  `unidade` varchar(20) DEFAULT 'unitario',
  `faixa_aplicacao` varchar(50) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `tipo_orcamento_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tipo_orcamento_id` (`tipo_orcamento_id`),
  CONSTRAINT `fk_mt_diversos_tipo` FOREIGN KEY (`tipo_orcamento_id`) REFERENCES `tipos_orcamento` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mt_diversos`
--

LOCK TABLES `mt_diversos` WRITE;
/*!40000 ALTER TABLE `mt_diversos` DISABLE KEYS */;
INSERT INTO `mt_diversos` VALUES (1,'TROCA DE CHASSIS ATÉ 50CM',30.00,'unitario','até 50cm',1,'2025-07-31 18:38:16',8),(2,'TROCA DE CHASSIS ACIMA 50CM',60.00,'unitario','acima 50cm',1,'2025-07-31 18:38:16',8),(3,'TROCA DE CANVAS ATÉ 50CM',40.00,'unitario','até 50cm',1,'2025-07-31 18:38:16',8),(4,'TROCA DE CANVAS ACIMA 50CM',70.00,'unitario','acima 50cm',1,'2025-07-31 18:38:16',8),(5,'TROCA DE PAPEL MATTE ATÉ 50CM',30.00,'unitario','até 50cm',1,'2025-07-31 18:38:16',8),(6,'TROCA DE PAPEL MATTE ACIMA DE 50CM',60.00,'unitario','acima 50cm',1,'2025-07-31 18:38:16',8),(7,'TROCA DE MOLDURA ATÉ 50CM',30.00,'unitario','até 50cm',1,'2025-07-31 18:38:16',8),(8,'TROCA DE MOLDURA ACIMA 50CM',50.00,'unitario','acima 50cm',1,'2025-07-31 18:38:16',8),(9,'TROCA DE VIDRO ATÉ 50CM',40.00,'unitario','até 50cm',1,'2025-07-31 18:38:16',8),(10,'TROCA DE VIDRO ACIMA 50CM',70.00,'unitario','acima 50cm',1,'2025-07-31 18:38:16',8),(11,'RETIRAR A ARTE',30.00,'unitario',NULL,1,'2025-07-31 18:38:16',8);
/*!40000 ALTER TABLE `mt_diversos` ENABLE KEYS */;
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
