package com.pulsopiura.platform.venues.application;

public class SlotNotBookableException extends RuntimeException {
    public SlotNotBookableException(String message) {
        super(message);
    }
}
