package com.aicc.eventmanagement.services;
import org.junit.jupiter.api.Test;
import com.aicc.eventmanagement.entities.Venue;
import static org.assertj.core.api.Assertions.*;
class LayoutCapacityTest {
 @Test void layoutCapacityControlsAdmissionAndUnknownLayoutsNeedConfirmation(){
  var room=Venue.builder().capacity(300).layoutCapacities("{\"THEATRE\":300,\"CLASSROOM\":132}").build();
  assertThatCode(()->LayoutCapacity.requireFit(room,"THEATRE",150)).doesNotThrowAnyException();
  assertThatThrownBy(()->LayoutCapacity.requireFit(room,"CLASSROOM",150)).hasMessageContaining("132");
  assertThatThrownBy(()->LayoutCapacity.requireFit(room,"BOARDROOM",20)).hasMessageContaining("not configured");
  assertThatThrownBy(()->LayoutCapacity.requireFit(room,"UNDECIDED",20)).hasMessageContaining("Choose");
 }
 @Test void configurationRejectsNegativeAndInventedLayouts(){
  assertThatThrownBy(()->LayoutCapacity.validate("{\"CLASSROOM\":-1}",300)).isInstanceOf(RuntimeException.class);
  assertThatThrownBy(()->LayoutCapacity.validate("{\"CLASSROOM\":400}",300)).isInstanceOf(RuntimeException.class);
  assertThatThrownBy(()->LayoutCapacity.validate("{\"FAKE\":20}",300)).isInstanceOf(RuntimeException.class);
 }
}
