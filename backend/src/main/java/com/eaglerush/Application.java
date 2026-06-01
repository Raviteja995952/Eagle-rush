package com.eaglerush;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
        System.out.println("=================================================");
        System.out.println("  EAGLE RUSH SPRING BOOT BACKEND RUNNING ON 8080 ");
        System.out.println("=================================================");
    }
}
