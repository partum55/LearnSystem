package com.university.lms.deadline.calendar.ics;

import com.university.lms.deadline.deadline.entity.Deadline;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Property;
import net.fortuna.ical4j.model.PropertyList;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.*;
import net.fortuna.ical4j.util.RandomUidGenerator;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.util.List;

@org.springframework.stereotype.Component
public class IcsExporter {

    public byte[] export(List<Deadline> deadlines) {
        Calendar calendar = new Calendar();
        calendar.getProperties().add(new ProdId("-//UCU LMS//Deadline Calendar//EN"));
        calendar.getProperties().add(Version.VERSION_2_0);
        calendar.getProperties().add(CalScale.GREGORIAN);

        RandomUidGenerator uidGenerator = new RandomUidGenerator();

        for (Deadline deadline : deadlines) {
            java.util.Date start = java.util.Date.from(deadline.getDueAt().toInstant());
            net.fortuna.ical4j.model.DateTime startDate = new net.fortuna.ical4j.model.DateTime(start);
            VEvent event = new VEvent(startDate, deadline.getTitle());
            PropertyList<Property> props = event.getProperties();
            props.add(uidGenerator.generateUid());
            if (deadline.getDescription() != null) {
                props.add(new Description(deadline.getDescription()));
            }
            props.add(new Categories(deadline.getType().name()));
            net.fortuna.ical4j.model.DateTime stampDate = new net.fortuna.ical4j.model.DateTime(
                    java.util.Date.from(deadline.getCreatedAt().toInstant()));
            props.add(new DtStamp(stampDate));
            calendar.getComponents().add(event);
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            calendar.validate(true);
            net.fortuna.ical4j.data.CalendarOutputter outputter = new net.fortuna.ical4j.data.CalendarOutputter();
            outputter.output(calendar, baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate ICS", e);
        }
    }
}

