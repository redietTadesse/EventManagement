package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

public final class LayoutCapacity {
    private LayoutCapacity() {}
    public static String validate(String encoded,Integer maximum) {
        if(encoded==null)return null;
        try {
            var node=new ObjectMapper().readTree(encoded);if(!node.isObject())throw new IllegalArgumentException();
            var fields=node.fields();while(fields.hasNext()){var entry=fields.next();
                if(!java.util.Set.of("THEATRE","CLASSROOM","BANQUET","CABARET","BOARDROOM","U_SHAPE").contains(entry.getKey())
                    ||!entry.getValue().isIntegralNumber()||!entry.getValue().canConvertToInt()||entry.getValue().asInt()<1
                    ||(maximum!=null&&entry.getValue().asInt()>maximum))throw new IllegalArgumentException();}
            return node.toString();
        }catch(Exception ex){throw new BusinessException("Enter positive whole-number seating capacities within the room maximum.","INVALID_LAYOUT_CAPACITY");}
    }
    public static Integer capacity(Venue venue, String setup) {
        if (setup == null || setup.isBlank() || setup.equals("UNDECIDED")) return venue.getCapacity();
        if (venue.getLayoutCapacities() == null) return setup.equals("THEATRE") ? venue.getCapacity() : null;
        try {
            var value = new ObjectMapper().readTree(venue.getLayoutCapacities()).path(setup);
            return value.isIntegralNumber() && value.asInt() > 0 ? value.asInt() : null;
        } catch (Exception e) { return null; }
    }
    public static void requireFit(Venue venue, String setup, Integer attendees) {
        Integer capacity = capacity(venue, setup);
        if ("UNDECIDED".equals(setup)) throw new BusinessException("Choose a seating setup before sending or signing the proposal.", "LAYOUT_REQUIRED");
        if (capacity == null) throw new BusinessException("Capacity for this seating setup is not configured. Ask the administrator to confirm it.", "LAYOUT_CAPACITY_UNKNOWN");
        if (attendees != null && attendees > capacity) throw new BusinessException("This room seats " + capacity + " in " + setup + " setup; attendance is " + attendees + ".", "LAYOUT_CAPACITY_EXCEEDED");
    }
}
